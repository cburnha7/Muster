import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

export const conversationsRouter = Router();
export const messagesRouter = Router();

// All conversation routes require auth
conversationsRouter.use(authMiddleware);
messagesRouter.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/unread-count
// Must be before /:id routes to avoid conflict
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId, isMuted: false },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    let total = 0;
    for (const p of participants) {
      const lastMsg = p.conversation.messages[0];
      if (!lastMsg) continue;
      if (!p.lastReadAt || lastMsg.createdAt > p.lastReadAt) {
        const count = await prisma.message.count({
          where: {
            conversationId: p.conversationId,
            createdAt: { gt: p.lastReadAt ?? new Date(0) },
          },
        });
        total += count;
      }
    }

    res.json({ count: total });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/dm/:userId — get or create DM
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.get('/dm/:userId', async (req, res) => {
  try {
    const myId = req.user!.userId;
    const { userId: otherId } = req.params;

    if (myId === otherId) {
      return res.status(400).json({ error: 'Cannot DM yourself' });
    }

    // Verify shared context (shared team or event)
    const [sharedTeam, sharedEvent] = await Promise.all([
      prisma.teamMember.findFirst({
        where: {
          team: { members: { some: { userId: myId, status: 'active' } } },
          userId: otherId,
          status: 'active',
        },
      }),
      prisma.gameParticipation.findFirst({
        where: {
          event: { gameParticipations: { some: { userId: myId } } },
          userId: otherId,
        },
      }),
    ]);

    if (!sharedTeam && !sharedEvent) {
      return res.status(403).json({ error: 'No shared context with this user' });
    }

    // Find existing DM
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT_MESSAGE',
        AND: [
          { participants: { some: { userId: myId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (existing) return res.json(existing);

    const created = await prisma.conversation.create({
      data: {
        type: 'DIRECT_MESSAGE',
        participants: {
          create: [
            { userId: myId, role: 'MEMBER' },
            { userId: otherId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json(created);
  } catch (error) {
    console.error('Get/create DM error:', error);
    res.status(500).json({ error: 'Failed to get or create DM' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/conversations/team/:teamId — get or create team conversation
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.post('/team/:teamId', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { teamId } = req.params;

    // Verify user is a member of this team
    const membership = await prisma.teamMember.findFirst({
      where: { teamId, userId, status: 'active' },
    });
    if (!membership) return res.status(403).json({ error: 'Not a team member' });

    // Check for existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: { type: 'TEAM_CHAT', entityId: teamId },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    if (!conversation) {
      // Create conversation and add ALL current team members
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: { where: { status: 'active' }, select: { userId: true, role: true } } },
      });
      if (!team) return res.status(404).json({ error: 'Team not found' });

      conversation = await prisma.conversation.create({
        data: {
          type: 'TEAM_CHAT',
          entityId: teamId,
          name: team.name,
          participants: {
            create: team.members.map((m) => ({
              userId: m.userId,
              role: m.role === 'captain' || m.role === 'manager' ? 'ADMIN' : 'MEMBER',
            })),
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
        },
      });

      // Post welcome system message
      const { MessagingService } = await import('../services/MessagingService');
      await MessagingService.postSystemMessage(conversation.id, `Team chat created for ${team.name}`);
    } else {
      // Ensure current user is a participant (they may have joined after conversation was created)
      const isParticipant = conversation.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        await prisma.conversationParticipant.create({
          data: { conversationId: conversation.id, userId, role: 'MEMBER' },
        });
      }
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get/create team conversation error:', error);
    res.status(500).json({ error: 'Failed to get or create team conversation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/conversations/event/:eventId — get or create game thread
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.post('/event/:eventId', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { eventId } = req.params;

    // Check for existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: { type: 'GAME_THREAD', entityId: eventId },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    if (!conversation) {
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, organizerId: true } });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      conversation = await prisma.conversation.create({
        data: {
          type: 'GAME_THREAD',
          entityId: eventId,
          name: event.title,
          participants: { create: { userId: event.organizerId, role: 'ADMIN' } },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
        },
      });

      const { MessagingService } = await import('../services/MessagingService');
      await MessagingService.postSystemMessage(conversation.id, `Game thread created for ${event.title}`);
    }

    // Ensure current user is a participant
    const isParticipant = conversation.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      await prisma.conversationParticipant.create({
        data: { conversationId: conversation.id, userId, role: 'MEMBER' },
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get/create game thread error:', error);
    res.status(500).json({ error: 'Failed to get or create game thread' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations — list my conversations
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { type } = req.query;

    const typeFilter = type && type !== 'ALL' ? { type: type as any } : {};

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId, conversation: { isArchived: false, ...typeFilter } },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            subChannels: {
              where: { isArchived: false },
              include: {
                participants: { where: { userId }, select: { lastReadAt: true, isMuted: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    // Calculate unread counts and shape response
    const conversations = await Promise.all(
      participations
        .filter((p) => !p.conversation.parentConversationId) // only top-level
        .map(async (p) => {
          const lastMsg = p.conversation.messages[0];
          const unreadCount = lastMsg
            ? await prisma.message.count({
                where: {
                  conversationId: p.conversationId,
                  createdAt: { gt: p.lastReadAt ?? new Date(0) },
                },
              })
            : 0;

          return {
            ...p.conversation,
            myParticipant: p,
            unreadCount,
          };
        })
    );

    res.json(conversations);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/:id — get conversation details
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
          },
        },
        subChannels: {
          where: { isArchived: false },
          include: {
            participants: { where: { userId }, select: { lastReadAt: true, isMuted: true, role: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const isParticipant = conversation.participants.some((p) => p.userId === userId);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/:id/messages — paginated messages (cursor-based)
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.get('/:id/messages', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { cursor, limit = '50' } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    // Verify participation
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(cursor ? { createdAt: { lt: new Date(cursor as string) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        reactions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const nextCursor = messages.length === take ? messages[messages.length - 1].createdAt.toISOString() : null;

    res.json({ messages: messages.reverse(), nextCursor });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/conversations/:id/messages — send a message
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.post('/:id/messages', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { content, replyToId } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    // Verify participation
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        type: 'USER',
        content: content.trim(),
        ...(replyToId ? { replyToId } : {}),
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        reactions: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Auto-mark sender as read
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { lastReadAt: new Date() },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/conversations/:id/read — mark as read
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, userId },
      data: { lastReadAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/conversations/:id/mute — toggle mute
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.put('/:id/mute', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { muted } = req.body;

    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, userId },
      data: { isMuted: muted },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mute error:', error);
    res.status(500).json({ error: 'Failed to update mute' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/conversations/:id/archive — toggle archive
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.put('/:id/archive', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) return res.status(404).json({ error: 'Not found' });

    await prisma.conversation.update({
      where: { id },
      data: { isArchived: !conversation.isArchived },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).json({ error: 'Failed to archive' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/conversations/:id/pin/:messageId — pin a message (admin only)
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.post('/:id/pin/:messageId', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id, messageId } = req.params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!participant || participant.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin only' });
    }

    await prisma.conversation.update({
      where: { id },
      data: { pinnedMessageId: messageId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Pin error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/conversations/:id/pin — unpin
// ─────────────────────────────────────────────────────────────────────────────
conversationsRouter.delete('/:id/pin', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!participant || participant.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin only' });
    }

    await prisma.conversation.update({
      where: { id },
      data: { pinnedMessageId: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unpin error:', error);
    res.status(500).json({ error: 'Failed to unpin' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/:id/reactions — add reaction
// ─────────────────────────────────────────────────────────────────────────────
messagesRouter.post('/:id/reactions', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id: messageId } = req.params;
    const { emoji } = req.body;

    const VALID_EMOJIS = ['🔥', '👍', '👏', '😂'];
    if (!VALID_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji' });
    }

    // Verify user is a participant in the conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    const reaction = await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      update: {},
      create: { messageId, userId, emoji },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.status(201).json(reaction);
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/messages/:id/reactions/:emoji — remove reaction
// ─────────────────────────────────────────────────────────────────────────────
messagesRouter.delete('/:id/reactions/:emoji', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id: messageId, emoji } = req.params;

    await prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji: decodeURIComponent(emoji) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});
