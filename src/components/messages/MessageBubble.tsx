import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';
import type { Message } from '../../types/messaging';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  showReadReceipt?: 'sending' | 'sent' | 'read' | null | undefined;
  currentUserId?: string | undefined;
  onLongPress: (message: Message) => void;
  onToggleReaction?: (messageId: string, emoji: string, hasMe: boolean) => void;
}

function groupReactions(
  reactions: Message['reactions'],
  currentUserId?: string,
): Array<{ emoji: string; count: number; hasMe: boolean; userIds: string[] }> {
  const map = new Map<string, { count: number; userIds: string[] }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count += 1;
      existing.userIds.push(r.userId);
    } else {
      map.set(r.emoji, { count: 1, userIds: [r.userId] });
    }
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    ...data,
    hasMe: currentUserId ? data.userIds.includes(currentUserId) : false,
  }));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function MessageBubble({
  message,
  isOwn,
  showSender,
  showAvatar,
  showTimestamp,
  showReadReceipt,
  currentUserId,
  onLongPress,
  onToggleReaction,
}: MessageBubbleProps) {
  const grouped = groupReactions(message.reactions, currentUserId);

  return (
    <TouchableWithoutFeedback onLongPress={() => onLongPress(message)}>
      <View style={[styles.row, isOwn && styles.rowOwn]}>
        {/* Avatar or spacer for other users */}
        {!isOwn && (
          showAvatar ? (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {message.sender?.firstName?.charAt(0) ?? '?'}
              </Text>
            </View>
          ) : (
            <View style={styles.avatarSpacer} />
          )
        )}

        <View style={[styles.column, isOwn && styles.columnOwn]}>
          {showSender && !isOwn && message.sender && (
            <Text style={styles.senderName}>
              {message.sender.firstName} {message.sender.lastName.charAt(0)}.
            </Text>
          )}

          {/* Quoted reply */}
          {message.replyTo && (
            <View style={[styles.replyQuote, isOwn && styles.replyQuoteOwn]}>
              <Text style={styles.replyName} numberOfLines={1}>
                {message.replyTo.sender?.firstName ?? 'Message'}
              </Text>
              <Text style={styles.replyText} numberOfLines={2}>{message.replyTo.content}</Text>
            </View>
          )}

          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, message.sendError && styles.bubbleError]}>
            <Text style={[styles.content, isOwn && styles.contentOwn]}>{message.content}</Text>
            {(showTimestamp || message.isSending || message.sendError) && (
              <View style={styles.metaRow}>
                {message.isSending && <Text style={[styles.status, isOwn && styles.statusOwn]}>Sending...</Text>}
                {message.sendError && <Text style={styles.statusError}>Failed</Text>}
                {showTimestamp && !message.isSending && !message.sendError && (
                  <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(message.createdAt)}</Text>
                )}
              </View>
            )}
          </View>

          {/* Read receipt */}
          {showReadReceipt && (
            <Text style={[styles.readReceipt, isOwn && styles.readReceiptOwn]}>
              {showReadReceipt === 'sending' ? 'Sending...' : showReadReceipt === 'read' ? 'Read' : 'Sent'}
            </Text>
          )}

          {/* Reactions */}
          {grouped.length > 0 && (
            <View style={[styles.reactions, isOwn && styles.reactionsOwn]}>
              {grouped.map((g) => (
                <TouchableOpacity
                  key={g.emoji}
                  style={[styles.reactionPill, g.hasMe && styles.reactionPillMine]}
                  onPress={() => onToggleReaction?.(message.id, g.emoji, g.hasMe)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{g.emoji}</Text>
                  <Text style={[styles.reactionCount, g.hasMe && styles.reactionCountMine]}>{g.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 2,
    alignItems: 'flex-end',
    gap: 8,
  },
  rowOwn: { flexDirection: 'row-reverse' },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarSpacer: {
    width: 28,
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.primary,
  },
  column: { maxWidth: '75%', gap: 2 },
  columnOwn: { alignItems: 'flex-end' },
  senderName: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
    paddingLeft: 4,
  },
  replyQuote: {
    backgroundColor: colors.surfaceContainer,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  replyQuoteOwn: { borderLeftColor: 'rgba(255,255,255,0.5)' },
  replyName: { fontFamily: fonts.label, fontSize: 11, color: colors.primary },
  replyText: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomLeftRadius: 4,
  },
  bubbleError: { opacity: 0.6 },
  content: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 21,
  },
  contentOwn: { color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.onSurfaceVariant },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  status: { fontFamily: fonts.body, fontSize: 11, color: colors.onSurfaceVariant },
  statusOwn: { color: 'rgba(255,255,255,0.7)' },
  statusError: { fontFamily: fonts.body, fontSize: 11, color: colors.error },
  readReceipt: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  readReceiptOwn: { textAlign: 'right' },
  reactions: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', paddingLeft: 4 },
  reactionsOwn: { justifyContent: 'flex-end', paddingLeft: 0, paddingRight: 4 },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 3,
  },
  reactionPillMine: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontFamily: fonts.label, fontSize: 12, color: colors.onSurface },
  reactionCountMine: { color: colors.primary },
});
