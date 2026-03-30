import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import type { Conversation } from '../../types/messaging';

interface ConversationRowProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

function getConversationIcon(type: Conversation['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'TEAM_CHAT': return 'people';
    case 'GAME_THREAD': return 'calendar';
    case 'LEAGUE_CHANNEL': return 'trophy';
    case 'DIRECT_MESSAGE': return 'person';
  }
}

function getConversationColor(type: Conversation['type']): string {
  switch (type) {
    case 'TEAM_CHAT': return colors.primary;
    case 'GAME_THREAD': return '#E86825';
    case 'LEAGUE_CHANNEL': return '#C4A017';
    case 'DIRECT_MESSAGE': return '#8B5CF6';
  }
}

function getDisplayName(conversation: Conversation): string {
  if (conversation.name) return conversation.name;
  if (conversation.type === 'DIRECT_MESSAGE') {
    const other = conversation.participants.find((p) => p.userId !== conversation.myParticipant?.userId);
    return other ? `${other.user.firstName} ${other.user.lastName}` : 'Direct Message';
  }
  return 'Conversation';
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const lastMsg = conversation.messages[0];
  const hasUnread = conversation.unreadCount > 0 && !conversation.myParticipant?.isMuted;
  const iconColor = getConversationColor(conversation.type);
  const displayName = getDisplayName(conversation);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(conversation)} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={getConversationIcon(conversation.type)} size={20} color={iconColor} />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
            {displayName}
          </Text>
          {lastMsg && (
            <Text style={[styles.timestamp, hasUnread && styles.timestampUnread]}>
              {formatTimestamp(lastMsg.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
            {lastMsg
              ? lastMsg.type === 'SYSTEM'
                ? lastMsg.content
                : `${lastMsg.sender?.firstName ?? ''}: ${lastMsg.content}`
              : 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
          {conversation.myParticipant?.isMuted && (
            <Ionicons name="volume-mute-outline" size={14} color={colors.onSurfaceVariant} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  nameUnread: { fontFamily: fonts.headingSemi },
  timestamp: { fontFamily: fonts.body, fontSize: 12, color: colors.onSurfaceVariant, flexShrink: 0 },
  timestampUnread: { fontFamily: fonts.label, color: colors.primary },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  previewUnread: { color: colors.onSurface, fontFamily: fonts.label },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.label, fontSize: 11, color: '#FFFFFF' },
});
