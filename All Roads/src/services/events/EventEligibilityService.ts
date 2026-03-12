/**
 * Event Eligibility Service
 * Validates user eligibility for events based on restrictions
 */

import { Event, EventEligibility, User, Team, SkillLevel } from '../../types';

export interface EligibilityCheckResult {
  eligible: boolean;
  reasons: string[];
}

export class EventEligibilityService {
  /**
   * Check if a user is eligible to join an event
   */
  static checkEligibility(
    event: Event,
    user: User,
    userTeams?: Team[]
  ): EligibilityCheckResult {
    const reasons: string[] = [];

    // If no eligibility restrictions, everyone is eligible
    if (!event.eligibility) {
      return { eligible: true, reasons: [] };
    }

    const eligibility = event.eligibility;

    // Check invite-only restriction
    if (eligibility.isInviteOnly) {
      reasons.push('This event is invite-only');
      return { eligible: false, reasons };
    }

    // Check team restrictions
    if (eligibility.restrictedToTeams && eligibility.restrictedToTeams.length > 0) {
      const userTeamIds = userTeams?.map(t => t.id) || [];
      const hasAllowedTeam = eligibility.restrictedToTeams.some(teamId =>
        userTeamIds.includes(teamId)
      );

      if (!hasAllowedTeam) {
        reasons.push('You must be a member of an allowed team');
      }
    }

    // Check league restrictions
    if (eligibility.restrictedToLeagues && eligibility.restrictedToLeagues.length > 0) {
      const userLeagueIds = userTeams?.map(t => t.leagueId).filter(Boolean) || [];
      const hasAllowedLeague = eligibility.restrictedToLeagues.some(leagueId =>
        userLeagueIds.includes(leagueId)
      );

      if (!hasAllowedLeague) {
        reasons.push('You must be in an allowed league');
      }
    }

    // Check age restrictions
    if (user.dateOfBirth) {
      const age = this.calculateAge(user.dateOfBirth);

      if (eligibility.minAge && age < eligibility.minAge) {
        reasons.push(`Minimum age requirement: ${eligibility.minAge} years`);
      }

      if (eligibility.maxAge && age > eligibility.maxAge) {
        reasons.push(`Maximum age requirement: ${eligibility.maxAge} years`);
      }
    } else if (eligibility.minAge || eligibility.maxAge) {
      reasons.push('Age verification required (update your profile)');
    }

    // Check skill level restrictions
    const skillLevelOrder = {
      [SkillLevel.BEGINNER]: 1,
      [SkillLevel.INTERMEDIATE]: 2,
      [SkillLevel.ADVANCED]: 3,
      [SkillLevel.ALL_LEVELS]: 0,
    };

    // Get user's skill level from their teams or profile
    const userSkillLevel = this.getUserSkillLevel(user, userTeams);

    if (eligibility.requiredSkillLevel) {
      if (userSkillLevel !== eligibility.requiredSkillLevel) {
        reasons.push(`Required skill level: ${this.formatSkillLevel(eligibility.requiredSkillLevel)}`);
      }
    } else {
      if (eligibility.minSkillLevel) {
        const userLevel = skillLevelOrder[userSkillLevel] || 0;
        const minLevel = skillLevelOrder[eligibility.minSkillLevel] || 0;

        if (userLevel < minLevel) {
          reasons.push(`Minimum skill level: ${this.formatSkillLevel(eligibility.minSkillLevel)}`);
        }
      }

      if (eligibility.maxSkillLevel) {
        const userLevel = skillLevelOrder[userSkillLevel] || 0;
        const maxLevel = skillLevelOrder[eligibility.maxSkillLevel] || 0;

        if (userLevel > maxLevel) {
          reasons.push(`Maximum skill level: ${this.formatSkillLevel(eligibility.maxSkillLevel)}`);
        }
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Get user's skill level from their teams or profile
   */
  private static getUserSkillLevel(user: User, userTeams?: Team[]): SkillLevel {
    // If user has teams, use the highest skill level from their teams
    if (userTeams && userTeams.length > 0) {
      const skillLevelOrder = {
        [SkillLevel.BEGINNER]: 1,
        [SkillLevel.INTERMEDIATE]: 2,
        [SkillLevel.ADVANCED]: 3,
        [SkillLevel.ALL_LEVELS]: 0,
      };

      const highestSkillLevel = userTeams.reduce((highest, team) => {
        const teamLevel = skillLevelOrder[team.skillLevel] || 0;
        const currentHighest = skillLevelOrder[highest] || 0;
        return teamLevel > currentHighest ? team.skillLevel : highest;
      }, SkillLevel.BEGINNER);

      return highestSkillLevel;
    }

    // Default to beginner if no teams
    return SkillLevel.BEGINNER;
  }

  /**
   * Format skill level for display
   */
  private static formatSkillLevel(skillLevel: SkillLevel): string {
    const labels = {
      [SkillLevel.BEGINNER]: 'Beginner',
      [SkillLevel.INTERMEDIATE]: 'Intermediate',
      [SkillLevel.ADVANCED]: 'Advanced',
      [SkillLevel.ALL_LEVELS]: 'All Levels',
    };

    return labels[skillLevel] || skillLevel;
  }

  /**
   * Get a summary of eligibility requirements for display
   */
  static getEligibilitySummary(eligibility?: EventEligibility): string[] {
    if (!eligibility) {
      return ['Open to all'];
    }

    const summary: string[] = [];

    if (eligibility.isInviteOnly) {
      summary.push('Invite only');
    }

    if (eligibility.restrictedToTeams && eligibility.restrictedToTeams.length > 0) {
      summary.push(`Restricted to ${eligibility.restrictedToTeams.length} team(s)`);
    }

    if (eligibility.restrictedToLeagues && eligibility.restrictedToLeagues.length > 0) {
      summary.push(`Restricted to ${eligibility.restrictedToLeagues.length} league(s)`);
    }

    if (eligibility.minAge || eligibility.maxAge) {
      if (eligibility.minAge && eligibility.maxAge) {
        summary.push(`Ages ${eligibility.minAge}-${eligibility.maxAge}`);
      } else if (eligibility.minAge) {
        summary.push(`Ages ${eligibility.minAge}+`);
      } else if (eligibility.maxAge) {
        summary.push(`Ages up to ${eligibility.maxAge}`);
      }
    }

    if (eligibility.requiredSkillLevel) {
      summary.push(`${this.formatSkillLevel(eligibility.requiredSkillLevel)} only`);
    } else {
      if (eligibility.minSkillLevel) {
        summary.push(`Min: ${this.formatSkillLevel(eligibility.minSkillLevel)}`);
      }
      if (eligibility.maxSkillLevel) {
        summary.push(`Max: ${this.formatSkillLevel(eligibility.maxSkillLevel)}`);
      }
    }

    return summary.length > 0 ? summary : ['Open to all'];
  }
}
