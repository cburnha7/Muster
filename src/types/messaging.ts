export type ConversationType = 'TEAM_CHAT' | 'GAME_THREAD' | 'LEAGUE_CHANNEL' | 'DIRECT_MESSAGE';
export type ParticipantRole = 'MEMBER' | 'ADMIN';
export type MessageType = 'USER' | 'SYSTEM';
export type MessagePriority = 'NORMAL' | 'URGENT';

export interface ConversationUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  user: ConversationUser;
  joinedAt: string;
  lastReadAt?: string;
  isMuted: boolean;
  role: ParticipantRole;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  user: ConversationUser;
  emoji: string;
  createdAt: string;
}

export interface ReplyPreview {
  id: string;
  content: string;
  sender?: ConversationUser | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId?: string | null;
  sender?: ConversationUser | null;
  type: MessageType;
  priority: MessagePriority;
  content: string;
  replyToId?: string | null;
  replyTo?: ReplyPreview | null;
  isEdited: boolean;
  editedAt?: string | null;
  createdAt: string;
  reactions: MessageReaction[];
  // optimistic UI
  isSending?: boolean;
  sendError?: boolean;
}

export interface SubChannel {
  id: string;
  name: string | null;
  parentConversationId: string | null;
  participants: Array<{ lastReadAt?: string | null; isMuted: boolean }>;
  messages: Array<{ createdAt: string; content: string }>;
  unreadCount?: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  entityId?: string | null;
  name?: string | null;
  parentConversationId?: string | null;
  pinnedMessageId?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
  subChannels?: SubChannel[];
  myParticipant?: ConversationParticipant;
  unreadCount: number;
}

export interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
}
