import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
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
  currentUserId?: string
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
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
  const { colors } = useTheme();
  const grouped = groupReactions(message.reactions, currentUserId);

  return (
    <TouchableWithoutFeedback onLongPress={() => onLongPress(message)}>
      <View style={[styles.row, isOwn && styles.rowOwn]}>
        {/* Avatar or spacer for other users */}
        {!isOwn &&
          (showAvatar ? (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.cobalt + '20' },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: colors.cobalt }]}>
                {message.sender?.firstName?.charAt(0) ?? '?'}
              </Text>
            </View>
          ) : (
            <View style={styles.avatarSpacer} />
          ))}

        <View style={[styles.column, isOwn && styles.columnOwn]}>
          {showSender && !isOwn && message.sender && (
            <Text style={[styles.senderName, { color: colors.cobalt }]}>
              {message.sender.firstName} {message.sender.lastName.charAt(0)}.
            </Text>
          )}

          {/* Quoted reply */}
          {message.replyTo && (
            <View
              style={[
                styles.replyQuote,
                {
                  backgroundColor: colors.bgSubtle,
                  borderLeftColor: colors.cobalt,
                },
                isOwn && styles.replyQuoteOwn,
              ]}
            >
              <Text
                style={[styles.replyName, { color: colors.cobalt }]}
                numberOfLines={1}
              >
                {message.replyTo.sender?.firstName ?? 'Message'}
              </Text>
              <Text
                style={[styles.replyText, { color: colors.inkSecondary }]}
                numberOfLines={2}
              >
                {message.replyTo.content}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
              isOwn ? { backgroundColor: colors.cobalt } : {},
              message.sendError && styles.bubbleError,
              message.priority === 'URGENT' && styles.bubbleAnnouncement,
              message.priority === 'URGENT' && { borderLeftColor: colors.gold },
            ]}
          >
            {message.priority === 'URGENT' && (
              <View style={styles.announceHeader}>
                <Ionicons name="megaphone" size={12} color={colors.gold} />
                <Text style={[styles.announceLabel, { color: colors.gold }]}>
                  Announcement
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.content,
                { color: colors.ink },
                isOwn && styles.contentOwn,
                isOwn && { color: colors.white },
              ]}
            >
              {message.content}
            </Text>
            {(showTimestamp || message.isSending || message.sendError) && (
              <View style={styles.metaRow}>
                {message.isSending && (
                  <Text
                    style={[
                      styles.status,
                      { color: colors.inkSecondary },
                      isOwn && styles.statusOwn,
                    ]}
                  >
                    Sending...
                  </Text>
                )}
                {message.sendError && (
                  <Text style={[styles.statusError, { color: colors.error }]}>
                    Failed
                  </Text>
                )}
                {showTimestamp && !message.isSending && !message.sendError && (
                  <Text
                    style={[
                      styles.time,
                      { color: colors.inkSecondary },
                      isOwn && styles.timeOwn,
                    ]}
                  >
                    {formatTime(message.createdAt)}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Read receipt */}
          {showReadReceipt && (
            <Text
              style={[
                styles.readReceipt,
                { color: colors.inkSecondary },
                isOwn && styles.readReceiptOwn,
              ]}
            >
              {showReadReceipt === 'sending'
                ? 'Sending...'
                : showReadReceipt === 'read'
                  ? 'Read'
                  : 'Sent'}
            </Text>
          )}

          {/* Reactions */}
          {grouped.length > 0 && (
            <View style={[styles.reactions, isOwn && styles.reactionsOwn]}>
              {grouped.map(g => (
                <TouchableOpacity
                  key={g.emoji}
                  style={[
                    styles.reactionPill,
                    { backgroundColor: colors.bgSubtle },
                    g.hasMe && styles.reactionPillMine,
                    g.hasMe && {
                      backgroundColor: colors.cobalt + '15',
                      borderColor: colors.cobalt + '40',
                    },
                  ]}
                  onPress={() =>
                    onToggleReaction?.(message.id, g.emoji, g.hasMe)
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{g.emoji}</Text>
                  <Text
                    style={[
                      styles.reactionCount,
                      { color: colors.ink },
                      g.hasMe && styles.reactionCountMine,
                      g.hasMe && { color: colors.cobalt },
                    ]}
                  >
                    {g.count}
                  </Text>
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
  },
  column: { maxWidth: '75%', gap: 2 },
  columnOwn: { alignItems: 'flex-end' },
  senderName: {
    fontFamily: fonts.label,
    fontSize: 12,
    marginBottom: 2,
    paddingLeft: 4,
  },
  replyQuote: {
    borderLeftWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  replyQuoteOwn: { borderLeftColor: 'rgba(255,255,255,0.5)' },
  replyName: { fontFamily: fonts.label, fontSize: 11 },
  replyText: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleError: { opacity: 0.6 },
  bubbleAnnouncement: {
    borderLeftWidth: 3,
  },
  announceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  announceLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  content: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  contentOwn: {},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  time: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  status: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  statusOwn: { color: 'rgba(255,255,255,0.7)' },
  statusError: { fontFamily: fonts.body, fontSize: 11 },
  readReceipt: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  readReceiptOwn: { textAlign: 'right' },
  reactions: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', paddingLeft: 4 },
  reactionsOwn: { justifyContent: 'flex-end', paddingLeft: 0, paddingRight: 4 },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 3,
  },
  reactionPillMine: {
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: {
    fontFamily: fonts.label,
    fontSize: 12,
  },
  reactionCountMine: {},
});
