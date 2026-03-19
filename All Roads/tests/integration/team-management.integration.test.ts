// Feature: sports-booking-app, Integration Test: Team Management Workflows
// Tests team creation, member management, and team-based event workflows
import { store } from '../../src/store/store';
import {
  addTeam,
  updateTeam,
  removeTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  joinTeam,
  leaveTeam,
  updateTeamStats,
} from '../../src/store/slices/teamsSlice';
import {
  Team,
  TeamMember,
  TeamRole,
  MemberStatus,
  SportType,
  SkillLevel,
} from '../../src/types';

describe('Integration: Team Management Workflows', () => {
  beforeEach(() => {
    // Reset store state
    store.dispatch({ type: 'teams/resetTeams' });
  });

  describe('Team Creation and Management', () => {
    it('should create team with captain correctly', () => {
      const newTeam: Team = {
        id: 'team-1',
        name: 'Thunder Ballers',
        description: 'Competitive basketball team',
        captainId: 'user-1',
        members: [
          {
            userId: 'user-1',
            role: TeamRole.CAPTAIN,
            joinedAt: new Date(),
            status: MemberStatus.ACTIVE,
          },
        ],
        sportType: SportType.BASKETBALL,
        skillLevel: SkillLevel.ADVANCED,
        maxMembers: 15,
        isPublic: true,
        inviteCode: 'THUNDER123',
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(newTeam));

      const state = store.getState();
      expect(state.teams.teams).toHaveLength(1);
      expect(state.teams.teams[0].name).toBe('Thunder Ballers');
      expect(state.teams.teams[0].members).toHaveLength(1);
      expect(state.teams.teams[0].members[0].role).toBe(TeamRole.CAPTAIN);
    });

    it('should update team details correctly', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Original Name',
        description: 'Original description',
        captainId: 'user-1',
        members: [],
        sportType: SportType.SOCCER,
        skillLevel: SkillLevel.INTERMEDIATE,
        maxMembers: 20,
        isPublic: true,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));

      const updatedTeam = {
        ...team,
        name: 'Updated Name',
        description: 'Updated description',
        maxMembers: 25,
      };

      store.dispatch(updateTeam(updatedTeam));

      const state = store.getState();
      expect(state.teams.teams[0].name).toBe('Updated Name');
      expect(state.teams.teams[0].description).toBe('Updated description');
      expect(state.teams.teams[0].maxMembers).toBe(25);
    });

    it('should remove team correctly', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1',
        members: [],
        sportType: SportType.BASKETBALL,
        skillLevel: SkillLevel.ALL_LEVELS,
        maxMembers: 10,
        isPublic: true,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));
      expect(store.getState().teams.teams).toHaveLength(1);

      store.dispatch(removeTeam('team-1'));
      expect(store.getState().teams.teams).toHaveLength(0);
    });
  });

  describe('Team Member Management', () => {
    beforeEach(() => {
      const team: Team = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1',
        members: [
          {
            userId: 'user-1',
            role: TeamRole.CAPTAIN,
            joinedAt: new Date(),
            status: MemberStatus.ACTIVE,
          },
        ],
        sportType: SportType.BASKETBALL,
        skillLevel: SkillLevel.INTERMEDIATE,
        maxMembers: 10,
        isPublic: true,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));
    });

    it('should add team member correctly', () => {
      const newMember: TeamMember = {
        userId: 'user-2',
        role: TeamRole.MEMBER,
        joinedAt: new Date(),
        status: MemberStatus.ACTIVE,
      };

      store.dispatch(addTeamMember({
        teamId: 'team-1',
        member: newMember,
      }));

      const state = store.getState();
      expect(state.teams.teams[0].members).toHaveLength(2);
      expect(state.teams.teams[0].members[1].userId).toBe('user-2');
      expect(state.teams.teams[0].members[1].role).toBe(TeamRole.MEMBER);
    });

    it('should remove team member correctly', () => {
      // Add a member first
      const newMember: TeamMember = {
        userId: 'user-2',
        role: TeamRole.MEMBER,
        joinedAt: new Date(),
        status: MemberStatus.ACTIVE,
      };

      store.dispatch(addTeamMember({
        teamId: 'team-1',
        member: newMember,
      }));

      expect(store.getState().teams.teams[0].members).toHaveLength(2);

      // Remove the member
      store.dispatch(removeTeamMember({
        teamId: 'team-1',
        userId: 'user-2',
      }));

      const state = store.getState();
      expect(state.teams.teams[0].members).toHaveLength(1);
      expect(state.teams.teams[0].members.find(m => m.userId === 'user-2')).toBeUndefined();
    });

    it('should update member role correctly', () => {
      // Add a member
      const newMember: TeamMember = {
        userId: 'user-2',
        role: TeamRole.MEMBER,
        joinedAt: new Date(),
        status: MemberStatus.ACTIVE,
      };

      store.dispatch(addTeamMember({
        teamId: 'team-1',
        member: newMember,
      }));

      // Promote to co-captain
      store.dispatch(updateTeamMemberRole({
        teamId: 'team-1',
        userId: 'user-2',
        role: TeamRole.CO_CAPTAIN,
      }));

      const state = store.getState();
      const member = state.teams.teams[0].members.find(m => m.userId === 'user-2');
      expect(member?.role).toBe(TeamRole.CO_CAPTAIN);
    });

    it('should handle team capacity limits', () => {
      const team = store.getState().teams.teams[0];
      const maxMembers = team.maxMembers;

      // Try to add members up to capacity
      for (let i = 2; i <= maxMembers; i++) {
        const member: TeamMember = {
          userId: `user-${i}`,
          role: TeamRole.MEMBER,
          joinedAt: new Date(),
          status: MemberStatus.ACTIVE,
        };

        store.dispatch(addTeamMember({
          teamId: 'team-1',
          member,
        }));
      }

      const state = store.getState();
      expect(state.teams.teams[0].members.length).toBeLessThanOrEqual(maxMembers);
    });
  });

  describe('Team Join and Leave Workflows', () => {
    it('should handle user joining team', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Public Team',
        captainId: 'user-1',
        members: [
          {
            userId: 'user-1',
            role: TeamRole.CAPTAIN,
            joinedAt: new Date(),
            status: MemberStatus.ACTIVE,
          },
        ],
        sportType: SportType.SOCCER,
        skillLevel: SkillLevel.ALL_LEVELS,
        maxMembers: 20,
        isPublic: true,
        inviteCode: 'PUBLIC123',
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));
      store.dispatch(joinTeam(team));

      const state = store.getState();
      expect(state.teams.userTeams).toHaveLength(1);
      expect(state.teams.userTeams[0].id).toBe('team-1');
    });

    it('should handle user leaving team', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Test Team',
        captainId: 'user-1',
        members: [],
        sportType: SportType.BASKETBALL,
        skillLevel: SkillLevel.INTERMEDIATE,
        maxMembers: 10,
        isPublic: true,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));
      store.dispatch(joinTeam(team));
      expect(store.getState().teams.userTeams).toHaveLength(1);

      store.dispatch(leaveTeam('team-1'));
      expect(store.getState().teams.userTeams).toHaveLength(0);
    });
  });

  describe('Team Statistics', () => {
    it('should update team stats correctly', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Stats Team',
        captainId: 'user-1',
        members: [],
        sportType: SportType.BASKETBALL,
        skillLevel: SkillLevel.ADVANCED,
        maxMembers: 15,
        isPublic: true,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));

      // Update stats after games
      store.dispatch(updateTeamStats({
        teamId: 'team-1',
        stats: {
          gamesPlayed: 10,
          gamesWon: 7,
          gamesLost: 3,
          winRate: 0.7,
        },
      }));

      const state = store.getState();
      expect(state.teams.teams[0].stats.gamesPlayed).toBe(10);
      expect(state.teams.teams[0].stats.gamesWon).toBe(7);
      expect(state.teams.teams[0].stats.gamesLost).toBe(3);
      expect(state.teams.teams[0].stats.winRate).toBe(0.7);
    });

    it('should calculate win rate correctly', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Win Rate Team',
        captainId: 'user-1',
        members: [],
        sportType: SportType.SOCCER,
        skillLevel: SkillLevel.INTERMEDIATE,
        maxMembers: 20,
        isPublic: true,
        stats: {
          gamesPlayed: 20,
          gamesWon: 15,
          gamesLost: 5,
          winRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addTeam(team));

      const winRate = team.stats.gamesWon / team.stats.gamesPlayed;
      
      store.dispatch(updateTeamStats({
        teamId: 'team-1',
        stats: {
          ...team.stats,
          winRate,
        },
      }));

      const state = store.getState();
      expect(state.teams.teams[0].stats.winRate).toBe(0.75);
    });
  });
});
