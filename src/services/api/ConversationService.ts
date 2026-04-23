import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS } from './config';
import type {
  Conversation,
  Message,
  MessagesPage,
  MessageReaction,
} from '../../types/messaging';

class ConversationServiceClass extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  async getConversations(
    type?: string,
    activeUserId?: string
  ): Promise<Conversation[]> {
    const params = type && type !== 'ALL' ? { type } : {};
    const headers: Record<string, string> = {};
    if (activeUserId) headers['X-Active-User-Id'] = activeUserId;
    return this.get<Conversation[]>(API_ENDPOINTS.CONVERSATIONS.BASE, {
      params,
      headers,
    });
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.get<Conversation>(API_ENDPOINTS.CONVERSATIONS.BY_ID(id));
  }

  async getMessages(id: string, cursor?: string): Promise<MessagesPage> {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    return this.get<MessagesPage>(API_ENDPOINTS.CONVERSATIONS.MESSAGES(id), {
      params,
    });
  }

  async sendMessage(
    id: string,
    content: string,
    replyToId?: string
  ): Promise<Message> {
    const body: Record<string, string> = { content };
    if (replyToId) body.replyToId = replyToId;
    return this.post<Message>(
      API_ENDPOINTS.CONVERSATIONS.SEND_MESSAGE(id),
      body
    );
  }

  async markRead(id: string): Promise<void> {
    return this.put<void>(API_ENDPOINTS.CONVERSATIONS.READ(id), {});
  }

  async setMuted(id: string, muted: boolean): Promise<void> {
    return this.put<void>(API_ENDPOINTS.CONVERSATIONS.MUTE(id), { muted });
  }

  async setArchived(id: string): Promise<void> {
    return this.put<void>(API_ENDPOINTS.CONVERSATIONS.ARCHIVE(id), {});
  }

  async pinMessage(conversationId: string, messageId: string): Promise<void> {
    return this.post<void>(
      API_ENDPOINTS.CONVERSATIONS.PIN(conversationId, messageId),
      {}
    );
  }

  async unpinMessage(conversationId: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.CONVERSATIONS.UNPIN(conversationId));
  }

  async getUnreadCount(): Promise<number> {
    const res = await this.get<{ count: number }>(
      API_ENDPOINTS.CONVERSATIONS.UNREAD_COUNT
    );
    return res.count;
  }

  async getOrCreateTeamChat(teamId: string): Promise<Conversation> {
    return this.post<Conversation>(
      API_ENDPOINTS.CONVERSATIONS.GET_OR_CREATE_TEAM(teamId),
      {}
    );
  }

  async getOrCreateGameThread(eventId: string): Promise<Conversation> {
    return this.post<Conversation>(
      API_ENDPOINTS.CONVERSATIONS.GET_OR_CREATE_EVENT(eventId),
      {}
    );
  }

  async getOrCreateLeagueChannel(leagueId: string): Promise<Conversation> {
    return this.post<Conversation>(
      API_ENDPOINTS.CONVERSATIONS.GET_OR_CREATE_LEAGUE(leagueId),
      {}
    );
  }

  async getDM(userId: string): Promise<Conversation> {
    return this.get<Conversation>(API_ENDPOINTS.CONVERSATIONS.DM(userId));
  }

  async addReaction(
    messageId: string,
    emoji: string
  ): Promise<MessageReaction> {
    return this.post<MessageReaction>(
      API_ENDPOINTS.MESSAGES.REACTIONS(messageId),
      { emoji }
    );
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    return this.delete<void>(
      API_ENDPOINTS.MESSAGES.REMOVE_REACTION(messageId, emoji)
    );
  }
}

export const conversationService = new ConversationServiceClass();
