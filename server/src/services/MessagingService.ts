import { prisma } from '../index';

export const MessagingService = {
  // Create a TEAM_CHAT conversation for a newly created team
  async createTeamChat(teamId: string, creatorId: string, teamName: string) {
    const conversation = await prisma.conversation.create({
      data: {
        type: 'TEAM_CHAT',
        entityId: teamId,
        name: teamName,
        participants: {
          create: {
            userId: creatorId,
            role: 'ADMIN',
          },
        },
      },
    });
    return conversation;
  },

  // Create a GAME_THREAD conversation for a newly created event
  async createGameThread(eventId: string, organizerId: string, eventTitle: string) {
    const conversation = await prisma.conversation.create({
      data: {
        type: 'GAME_THREAD',
        entityId: eventId,
        name: eventTitle,
        participants: {
          create: {
            userId: organizerId,
            role: 'ADMIN',
          },
        },
      },
    });
    return conversation;
  },

  // Create the 3 LEAGUE_CHANNEL sub-channels for a new league
  async createLeagueChannels(leagueId: string, commissionerId: string, leagueName: string) {
    // General channel (parent)
    const general = await prisma.conversation.create({
      data: {
        type: 'LEAGUE_CHANNEL',
        entityId: leagueId,
        name: `${leagueName} — General`,
        participants: {
          create: { userId: commissionerId, role: 'ADMIN' },
        },
      },
    });
    // Captains sub-channel
    const captains = await prisma.conversation.create({
      data: {
        type: 'LEAGUE_CHANNEL',
        entityId: leagueId,
        name: `${leagueName} — Captains`,
        parentConversationId: general.id,
        participants: {
          create: { userId: commissionerId, role: 'ADMIN' },
        },
      },
    });
    // Facilities sub-channel
    const facilities = await prisma.conversation.create({
      data: {
        type: 'LEAGUE_CHANNEL',
        entityId: leagueId,
        name: `${leagueName} — Facilities`,
        parentConversationId: general.id,
        participants: {
          create: { userId: commissionerId, role: 'ADMIN' },
        },
      },
    });
    return { general, captains, facilities };
  },

  // Add a user as a participant (no-op if already a participant)
  async addParticipant(conversationId: string, userId: string, role: 'MEMBER' | 'ADMIN' = 'MEMBER') {
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: { conversationId, userId, role },
    });
  },

  // Remove a user from a conversation
  async removeParticipant(conversationId: string, userId: string) {
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId, userId },
    });
  },

  // Post a system message (no sender)
  async postSystemMessage(conversationId: string, content: string, priority: 'NORMAL' | 'URGENT' = 'NORMAL') {
    return prisma.message.create({
      data: {
        conversationId,
        type: 'SYSTEM',
        priority,
        content,
        senderId: null,
      },
    });
  },

  // Get the TEAM_CHAT conversation for a team
  async getConversationForTeam(teamId: string) {
    return prisma.conversation.findFirst({
      where: { type: 'TEAM_CHAT', entityId: teamId },
    });
  },

  // Get the GAME_THREAD conversation for an event
  async getConversationForEvent(eventId: string) {
    return prisma.conversation.findFirst({
      where: { type: 'GAME_THREAD', entityId: eventId },
    });
  },

  // Get all LEAGUE_CHANNEL conversations for a league
  async getConversationsForLeague(leagueId: string) {
    return prisma.conversation.findMany({
      where: { type: 'LEAGUE_CHANNEL', entityId: leagueId },
    });
  },

  // Get or create a 1:1 DM conversation between two users
  async getOrCreateDM(userId1: string, userId2: string) {
    // Find existing DM where both users are participants
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT_MESSAGE',
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
      include: { participants: true },
    });
    if (existing) return existing;

    return prisma.conversation.create({
      data: {
        type: 'DIRECT_MESSAGE',
        participants: {
          create: [
            { userId: userId1, role: 'MEMBER' },
            { userId: userId2, role: 'MEMBER' },
          ],
        },
      },
      include: { participants: true },
    });
  },
};
