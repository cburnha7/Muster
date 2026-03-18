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
    userTeams?: Team[],
    userSportPercentile?: number // 0-100 percentile for the event's sport
  ): EligibilityCheckResult {
    const reasons: string[] = [];

    // If no eligibility restrictions and no minPlayerRating, everyone is eligible
    if (!event.eligibility && event.minPlayerRating == null) {
      return { eligible: true, reasons: [] };
    }

    // Check minPlayerRating restriction
    if (event.minPlayerRating != null && event.minPlayerRating > 0) {
      if (userSportPercentile == null) {
        reasons.push(`Minimum ${event.minPlayerRating}th percentile rating required (no rating found)`);
      } else if (userSportPercentile < event.minPlayerRating) {
        reasons.push(
          `Minimum ${event.minPlayerRating}th percentile rating required (yours: ${Math.round(userSportPercentile)})`
        );
      }
    }

    if (!event.eligibility) {
      return { eligible: reasons.length === 0, reasons };
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
        reasons.push('You must be a player of an allowed roster');
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
   * Get a summary of eligibility requirements for display
   */
  static getEligibilitySummary(eligibility?: EventEligibility, minPlayerRating?: number): string[] {
    const summary: string[] = [];

    // Show minPlayerRating requirement
    if (minPlayerRating != null && minPlayerRating > 0) {
      summary.push(`${minPlayerRating}+ rating required`);
    }

    if (!eligibility) {
      return summary.length > 0 ? summary : ['Open to all'];
    }

    if (eligibility.isInviteOnly) {
      summary.push('Invite only');
    }

    if (eligibility.restrictedToTeams && eligibility.restrictedToTeams.length > 0) {
      summary.push(`Restricted to ${eligibility.restrictedToTeams.length} roster(s)`);
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

    return summary.length > 0 ? summary : ['Open to all'];
  }
}
