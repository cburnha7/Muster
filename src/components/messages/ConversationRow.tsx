import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
import { tokenSport } from '../../theme/tokens';
import type { Conversation } from '../../types/messaging';

interface ConversationRowProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
  onMute?: (conversation: Conversation) => void;
  onPin?: (conversation: Conversation) => void;
}

function getConversationIcon(
  type: Conversation['type']
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'TEAM_CHAT':
      return 'people';
    case 'GAME_THREAD':
      return 'calendar';
    case 'LEAGUE_CHANNEL':
      return 'trophy';
    case 'DIRECT_MESSAGE':
      return 'person';
  }
}

function getConversationColor(type: Conversation['type']): string {
  switch (type) {
    case 'TEAM_CHAT':
      return colors.primary;
    case 'GAME_THREAD':
      return tokenSport.basketball.solid;
    case 'LEAGUE_CHANNEL':
      return colors.warning;
    case 'DIRECT_MESSAGE':
      return tokenSport.volleyball.solid;
  }
}

function getDisplayName(conversation: Conversation): string {
  if (conversation.name) return conversation.name;
  if (conversation.type === 'DIRECT_MESSAGE') {
    const other = conversation.participants.find(
      p => p.userId !== conversation.myParticipant?.userId
    );
    return other
      ? `${other.user.firstName} ${other.user.lastName}`
      : 'Direct Message';
  }
  return 'Conversation';
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConversationRowInner({
  conversation,
  onPress,
  onMute,
  onPin,
}: ConversationRowProps) {
  const { colors } = useTheme();
  const lastMsg = conversation.messages[0];
  const hasUnread =
    conversation.unreadCount > 0 && !conversation.myParticipant?.isMuted;
  const isMuted = conversation.myParticipant?.isMuted ?? false;
  const iconColor = getConversationColor(conversation.type);
  const displayName = getDisplayName(conversation);
  const isSystemPreview = lastMsg?.type === 'SYSTEM';
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={[styles.swipeActionLeft, { backgroundColor: colors.onSurfaceVariant }]}
        onPress={() => {
          swipeableRef.current?.close();
          onMute?.(conversation);
        }}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[styles.swipeActionContent, { transform: [{ scale }] }]}
        >
          <Ionicons
            name={isMuted ? 'volume-high' : 'volume-mute'}
            size={22}
            color={colors.white}
          />
          <Text style={[styles.swipeActionText, { color: colors.white }]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={[styles.swipeActionRight, { backgroundColor: colors.primary }]}
        onPress={() => {
          swipeableRef.current?.close();
          onPin?.(conversation);
        }}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[styles.swipeActionContent, { transform: [{ scale }] }]}
        >
          <Ionicons name="pin" size={22} color={colors.white} />
          <Text style={[styles.swipeActionText, { color: colors.white }]}>Pin</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const rowContent = (
    <TouchableOpacity
      style={[
        styles.row, { backgroundColor: colors.surfaceContainerLowest },
        { backgroundColor: colors.bgCard },
        hasUnread && styles.rowUnread, hasUnread && { backgroundColor: colors.primary + '08' },
        isMuted && styles.rowMuted]}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      {conversation.type === 'DIRECT_MESSAGE' ? (
        (() => {
          const other = conversation.participants.find(
            p => p.userId !== conversation.myParticipant?.userId
          );
          const initial =
            other?.user?.firstName?.charAt(0)?.toUpperCase() ?? '?';
          const profileImg = other?.user?.profileImage;
          return (
            <View
              style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}
            >
              <Text style={[styles.dmInitial, { color: iconColor }]}>
                {initial}
              </Text>
            </View>
          );
        })()
      ) : (
        <View
          style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}
        >
          <Ionicons
            name={getConversationIcon(conversation.type)}
            size={20}
            color={iconColor}
          />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name, { color: colors.onSurface },
              { color: colors.textPrimary },
              hasUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {lastMsg && (
            <Text
              style={[
                styles.timestamp, { color: colors.onSurfaceVariant },
                { color: colors.textSecondary },
                hasUnread && styles.timestampUnread, hasUnread && { color: colors.primary }]}
            >
              {formatTimestamp(lastMsg.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview, { color: colors.onSurfaceVariant },
              { color: colors.textSecondary },
              hasUnread && styles.previewUnread, hasUnread && { color: colors.onSurface },
              isSystemPreview && styles.previewSystem]}
            numberOfLines={1}
          >
            {lastMsg
              ? isSystemPreview
                ? lastMsg.content
                : `${lastMsg.sender?.firstName ?? ''}: ${lastMsg.content}`
              : 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.white }]}>
                {conversation.unreadCount > 99
                  ? '99+'
                  : conversation.unreadCount}
              </Text>
            </View>
          )}
          {isMuted && (
            <Ionicons
              name="volume-mute-outline"
              size={14}
              color={colors.textSecondary}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!onMute && !onPin) return rowContent;

  return (
    <Swipeable
      ref={swipeableRef}
      {...(onMute ? { renderLeftActions } : {})}
      {...(onPin ? { renderRightActions } : {})}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      {rowContent}
    </Swipeable>
  );
}

export const ConversationRow = React.memo(ConversationRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowUnread: {},
  rowMuted: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dmInitial: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  nameUnread: { fontFamily: fonts.headingSemi },
  timestamp: {
    fontFamily: fonts.body,
    fontSize: 12,
    flexShrink: 0,
  },
  timestampUnread: { fontFamily: fonts.label },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  previewUnread: { fontFamily: fonts.label },
  previewSystem: { fontStyle: 'italic' },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
  swipeActionLeft: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    width: 90,
  },
  swipeActionRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    width: 90,
  },
  swipeActionContent: {
    alignItems: 'center',
    gap: 4,
  },
  swipeActionText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
});
