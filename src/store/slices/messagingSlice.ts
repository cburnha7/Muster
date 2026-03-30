import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Conversation, Message } from '../../types/messaging';

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // keyed by conversationId
  nextCursors: Record<string, string | null>; // pagination cursors
  unreadCount: number;
  isLoadingConversations: boolean;
  isLoadingMessages: Record<string, boolean>;
  error: string | null;
}

const initialState: MessagingState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  nextCursors: {},
  unreadCount: 0,
  isLoadingConversations: false,
  isLoadingMessages: {},
  error: null,
};

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<Conversation[]>) {
      state.conversations = action.payload;
      state.isLoadingConversations = false;
      state.error = null;
    },
    setLoadingConversations(state, action: PayloadAction<boolean>) {
      state.isLoadingConversations = action.payload;
    },
    setMessages(state, action: PayloadAction<{ conversationId: string; messages: Message[]; nextCursor: string | null }>) {
      const { conversationId, messages, nextCursor } = action.payload;
      state.messages[conversationId] = messages;
      state.nextCursors[conversationId] = nextCursor;
      state.isLoadingMessages[conversationId] = false;
    },
    prependMessages(state, action: PayloadAction<{ conversationId: string; messages: Message[]; nextCursor: string | null }>) {
      const { conversationId, messages, nextCursor } = action.payload;
      const existing = state.messages[conversationId] ?? [];
      state.messages[conversationId] = [...messages, ...existing];
      state.nextCursors[conversationId] = nextCursor;
    },
    appendOptimisticMessage(state, action: PayloadAction<{ conversationId: string; message: Message }>) {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      state.messages[conversationId].push(message);
    },
    confirmOptimisticMessage(state, action: PayloadAction<{ conversationId: string; tempId: string; message: Message }>) {
      const { conversationId, tempId, message } = action.payload;
      const msgs = state.messages[conversationId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m.id === tempId);
      if (idx !== -1) msgs[idx] = message;
    },
    markOptimisticError(state, action: PayloadAction<{ conversationId: string; tempId: string }>) {
      const { conversationId, tempId } = action.payload;
      const msgs = state.messages[conversationId];
      if (!msgs) return;
      const msg = msgs.find((m) => m.id === tempId);
      if (msg) msg.sendError = true;
    },
    addIncomingMessage(state, action: PayloadAction<{ conversationId: string; message: Message }>) {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) return; // only update if chat is loaded
      state.messages[conversationId].push(message);
      // update last message in conversation list
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.messages = [message];
        conv.updatedAt = message.createdAt;
        if (conversationId !== state.activeConversationId) conv.unreadCount += 1;
      }
    },
    updateReactions(state, action: PayloadAction<{ conversationId: string; messageId: string; reactions: Message['reactions'] }>) {
      const { conversationId, messageId, reactions } = action.payload;
      const msgs = state.messages[conversationId];
      if (!msgs) return;
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) msg.reactions = reactions;
    },
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    markConversationRead(state, action: PayloadAction<string>) {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) conv.unreadCount = 0;
      // recalculate total
      state.unreadCount = state.conversations.reduce((sum, c) => sum + (c.myParticipant?.isMuted ? 0 : c.unreadCount), 0);
    },
    setLoadingMessages(state, action: PayloadAction<{ conversationId: string; loading: boolean }>) {
      state.isLoadingMessages[action.payload.conversationId] = action.payload.loading;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoadingConversations = false;
    },
  },
});

export const {
  setConversations,
  setLoadingConversations,
  setMessages,
  prependMessages,
  appendOptimisticMessage,
  confirmOptimisticMessage,
  markOptimisticError,
  addIncomingMessage,
  updateReactions,
  setActiveConversation,
  setUnreadCount,
  markConversationRead,
  setLoadingMessages,
  setError,
} = messagingSlice.actions;

export default messagingSlice.reducer;
