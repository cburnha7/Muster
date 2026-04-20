import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import { MessageBubble } from '../../components/messages/MessageBubble';
import { SystemMessage } from '../../components/messages/SystemMessage';
import { MessageInput } from '../../components/messages/MessageInput';
import { ReactionPicker } from '../../components/messages/ReactionPicker';
import { PinnedMessageBanner } from '../../components/messages/PinnedMessageBanner';
import { conversationService } from '../../services/api/ConversationService';
import {
  setMessages,
  prependMessages,
  appendOptimisticMessage,
  confirmOptimisticMessage,
  markOptimisticError,
  setLoadingMessages,
  setActiveConversation,
  markConversationRead,
} from '../../store/slices/messagingSlice';
import type { RootState } from '../../store/store';
import type { Message } from '../../types/messaging';
import type { MessagesStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MessagesStackParamList, 'Chat'>;
type Route = RouteProp<MessagesStackParamList, 'Chat'>;

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function ChatScreen() {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId, title, type } = route.params ?? {};
  const dispatch = useDispatch();

  const currentUserId = useSelector((state: RootState) => state.auth?.user?.id);
  const messages = useSelector(
    (state: RootState) => state.messaging?.messages[conversationId] ?? []
  );
  const nextCursor = useSelector(
    (state: RootState) => state.messaging?.nextCursors[conversationId]
  );
  const isLoadingMsgs = useSelector(
    (state: RootState) =>
      state.messaging?.isLoadingMessages[conversationId] ?? false
  );
  const conversation = useSelector((state: RootState) =>
    state.messaging?.conversations.find(c => c.id === conversationId)
  );

  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const listRef = useRef<FlatList>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map(m => m.id));
  }, [messages]);

  useEffect(() => {
    navigation.setOptions({ headerTitle: title });
  }, [navigation, title]);

  const loadMessages = useCallback(async () => {
    dispatch(setLoadingMessages({ conversationId, loading: true }));
    try {
      const page = await conversationService.getMessages(conversationId);
      dispatch(
        setMessages({
          conversationId,
          messages: page.messages,
          nextCursor: page.nextCursor,
        })
      );
      await conversationService.markRead(conversationId);
      dispatch(markConversationRead(conversationId));
    } catch (err: any) {
      console.error('Load messages error:', err);
      dispatch(setLoadingMessages({ conversationId, loading: false }));
    }
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (conversation?.pinnedMessageId) {
      const pinned = messages.find(m => m.id === conversation.pinnedMessageId);
      if (pinned) setPinnedMessage(pinned.content);
    } else {
      setPinnedMessage(null);
    }
  }, [conversation?.pinnedMessageId, messages]);

  useFocusEffect(
    useCallback(() => {
      dispatch(setActiveConversation(conversationId));
      loadMessages();

      const interval = setInterval(async () => {
        try {
          const page = await conversationService.getMessages(conversationId);
          const newMsgs = page.messages.filter(
            m => !messageIdsRef.current.has(m.id)
          );
          if (newMsgs.length > 0) {
            dispatch(
              setMessages({
                conversationId,
                messages: page.messages,
                nextCursor: page.nextCursor,
              })
            );
            if (isAtBottomRef.current) {
              setTimeout(
                () => listRef.current?.scrollToEnd({ animated: true }),
                100
              );
            } else {
              setShowNewMessagesPill(true);
            }
          }
        } catch (err) {
          console.warn('Chat polling failed:', (err as Error).message);
        }
      }, 5000);

      return () => {
        clearInterval(interval);
        dispatch(setActiveConversation(null));
      };
    }, [conversationId, dispatch, loadMessages])
  );

  const loadOlder = async () => {
    if (!nextCursor || isLoadingMsgs) return;
    dispatch(setLoadingMessages({ conversationId, loading: true }));
    try {
      const page = await conversationService.getMessages(
        conversationId,
        nextCursor
      );
      dispatch(
        prependMessages({
          conversationId,
          messages: page.messages,
          nextCursor: page.nextCursor,
        })
      );
    } catch (err: any) {
      console.error('Load older error:', err);
      dispatch(setLoadingMessages({ conversationId, loading: false }));
    }
  };

  const handleSend = async (text: string) => {
    if (!currentUserId) return;

    // Captain /announce command — sends as URGENT priority
    const isAnnouncement = text.startsWith('/announce ');
    const content = isAnnouncement
      ? text.slice('/announce '.length).trim()
      : text;
    if (!content) return;
    const priority = isAnnouncement ? 'URGENT' : 'NORMAL';

    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      sender: null,
      type: 'USER',
      priority,
      content,
      replyToId: null,
      replyTo: null,
      isEdited: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      reactions: [],
      isSending: true,
    };
    dispatch(appendOptimisticMessage({ conversationId, message: optimistic }));
    isAtBottomRef.current = true;
    setShowNewMessagesPill(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const sent = await conversationService.sendMessage(
        conversationId,
        content
      );
      dispatch(
        confirmOptimisticMessage({ conversationId, tempId, message: sent })
      );
    } catch {
      dispatch(markOptimisticError({ conversationId, tempId }));
      Alert.alert('Failed to send', 'Tap to retry');
    }
  };

  const handleLongPress = (message: Message) => {
    if (message.type === 'SYSTEM') return;
    setSelectedMessage(message);
    setShowReactions(true);
  };

  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    try {
      await conversationService.addReaction(selectedMessage.id, emoji);
      const page = await conversationService.getMessages(conversationId);
      dispatch(
        setMessages({
          conversationId,
          messages: page.messages,
          nextCursor: page.nextCursor,
        })
      );
    } catch (err: any) {
      console.error('Reaction error:', err);
    }
    setSelectedMessage(null);
  };

  const handleToggleReaction = async (
    messageId: string,
    emoji: string,
    hasMe: boolean
  ) => {
    try {
      if (hasMe) {
        await conversationService.removeReaction(messageId, emoji);
      } else {
        await conversationService.addReaction(messageId, emoji);
      }
      const page = await conversationService.getMessages(conversationId);
      dispatch(
        setMessages({
          conversationId,
          messages: page.messages,
          nextCursor: page.nextCursor,
        })
      );
    } catch (err: any) {
      console.error('Toggle reaction error:', err);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const atBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 60;
    isAtBottomRef.current = atBottom;
    if (atBottom && showNewMessagesPill) {
      setShowNewMessagesPill(false);
    }
  };

  const scrollToBottom = () => {
    listRef.current?.scrollToEnd({ animated: true });
    setShowNewMessagesPill(false);
    isAtBottomRef.current = true;
  };

  // Build render items with day headers
  type RenderItem =
    | { kind: 'message'; message: Message }
    | { kind: 'dayHeader'; label: string; id: string };

  const renderItems: RenderItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    if (!msg) continue;
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      renderItems.push({
        kind: 'dayHeader',
        label: formatDayHeader(msg.createdAt),
        id: `header_${msg.createdAt}`,
      });
    }
    renderItems.push({ kind: 'message', message: msg });
  }

  // Find the last own message index for read receipts
  let lastOwnMessageIdx = -1;
  for (let i = renderItems.length - 1; i >= 0; i--) {
    const item = renderItems[i];
    if (
      item?.kind === 'message' &&
      item.message.senderId === currentUserId &&
      item.message.type === 'USER'
    ) {
      lastOwnMessageIdx = i;
      break;
    }
  }

  // Determine read receipt status for the last own message
  const getReadReceipt = (): 'sending' | 'sent' | 'read' | null => {
    if (lastOwnMessageIdx === -1) return null;
    const item = renderItems[lastOwnMessageIdx];
    if (item?.kind !== 'message') return null;
    const msg = item.message;
    if (msg.isSending) return 'sending';
    if (msg.sendError) return null;
    // For DMs, check if the other participant has read
    if (type === 'DIRECT_MESSAGE' && conversation) {
      const other = conversation.participants.find(
        p => p.userId !== currentUserId
      );
      if (
        other?.lastReadAt &&
        new Date(other.lastReadAt) >= new Date(msg.createdAt)
      ) {
        return 'read';
      }
    }
    return 'sent';
  };

  const readReceiptStatus = getReadReceipt();

  const renderItem = ({ item, index }: { item: RenderItem; index: number }) => {
    if (item.kind === 'dayHeader') {
      return (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>{item.label}</Text>
        </View>
      );
    }

    const { message } = item;

    if (message.type === 'SYSTEM') {
      return (
        <SystemMessage content={message.content} priority={message.priority} />
      );
    }

    const isOwn = message.senderId === currentUserId;
    // Show sender name if previous message was from a different person
    const prevItem = renderItems[index - 1];
    const prevMsg = prevItem?.kind === 'message' ? prevItem.message : null;
    const showSender =
      !isOwn &&
      (!prevMsg ||
        prevMsg.senderId !== message.senderId ||
        prevMsg.type === 'SYSTEM');

    // Show avatar only on first message of consecutive group (same logic as showSender)
    const showAvatar = showSender;

    // Show timestamp only on last message of consecutive group
    const nextItem = renderItems[index + 1];
    const nextMsg = nextItem?.kind === 'message' ? nextItem.message : null;
    const showTimestamp =
      !nextMsg ||
      nextMsg.senderId !== message.senderId ||
      nextMsg.type === 'SYSTEM' ||
      nextItem?.kind === 'dayHeader';

    // Read receipt only on the very last own message
    const showReadReceipt =
      index === lastOwnMessageIdx ? readReceiptStatus : null;

    return (
      <MessageBubble
        message={message}
        isOwn={isOwn}
        showSender={showSender}
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
        showReadReceipt={showReadReceipt}
        currentUserId={currentUserId}
        onLongPress={handleLongPress}
        onToggleReaction={handleToggleReaction}
      />
    );
  };

  const getItemKey = (item: RenderItem) => {
    if (item.kind === 'dayHeader') return item.id;
    return item.message.id;
  };

  const conversationTypeName = () => {
    switch (type) {
      case 'TEAM_CHAT':
        return 'Team Chat';
      case 'GAME_THREAD':
        return 'Game Thread';
      case 'LEAGUE_CHANNEL':
        return 'League Channel';
      case 'DIRECT_MESSAGE':
        return 'Direct Message';
      default:
        return 'Chat';
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {pinnedMessage && <PinnedMessageBanner content={pinnedMessage} />}

      {isLoadingMsgs && messages.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={renderItems}
            keyExtractor={getItemKey}
            renderItem={renderItem}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.2}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              isLoadingMsgs && messages.length > 0 ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ margin: 12 }}
                />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  No messages yet. Start the{' '}
                  {conversationTypeName().toLowerCase()}!
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />

          {/* New messages pill */}
          {showNewMessagesPill && (
            <TouchableOpacity
              style={styles.newMessagesPill}
              onPress={scrollToBottom}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-down" size={14} color={colors.white} />
              <Text style={styles.newMessagesPillText}>New messages</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <MessageInput onSend={handleSend} />

      {showReactions && (
        <ReactionPicker
          onSelect={handleReaction}
          onDismiss={() => {
            setShowReactions(false);
            setSelectedMessage(null);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingTop: 12, paddingBottom: 8 },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyChat: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyChatText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  newMessagesPill: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    shadowColor: tokenColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  newMessagesPillText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.white,
  },
});
