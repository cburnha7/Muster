import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  useNotifications,
  NotificationItem,
} from '../../hooks/useNotifications';
import { colors, fonts, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  roster_invitation: 'people-outline',
  league_invitation: 'trophy-outline',
  event_invitation: 'calendar-outline',
  schedule_league: 'calendar-outline',
  debrief: 'chatbox-ellipses-outline',
  cancel_request: 'close-circle-outline',
  game_challenge: 'flash-outline',
};

export function NotificationBell() {
  const { colors: themeColors } = useTheme();
  const { items, count } = useNotifications();
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();

  const handleItemPress = (item: NotificationItem) => {
    setVisible(false);
    switch (item.type) {
      case 'roster_invitation':
        navigation.navigate('Teams', {
          screen: 'TeamDetails',
          params: { teamId: item.data.rosterId },
        });
        break;
      case 'league_invitation':
        navigation.navigate('Leagues', {
          screen: 'LeagueDetails',
          params: { leagueId: item.data.leagueId },
        });
        break;
      case 'event_invitation':
        navigation.navigate('Home', {
          screen: 'EventDetails',
          params: { eventId: item.data.eventId },
        });
        break;
      case 'schedule_league':
        navigation.navigate('Leagues', {
          screen: 'LeagueScheduling',
          params: { leagueId: item.data.id },
        });
        break;
      case 'debrief':
        navigation.navigate('Home', {
          screen: 'Debrief',
          params: { eventId: item.data.event?.id, bookingId: item.data.id },
        });
        break;
      default:
        break;
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={themeColors.textPrimary}
        />
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {count > 99 ? '99+' : String(count)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: themeColors.bgCard }]}
            onPress={e => e.stopPropagation()}
          >
            <SafeAreaView>
              <View
                style={[
                  styles.panelHeader,
                  { borderBottomColor: themeColors.border },
                ]}
              >
                <Text
                  style={[
                    styles.panelTitle,
                    { color: themeColors.textPrimary },
                  ]}
                >
                  Notifications
                </Text>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <Ionicons
                    name="close"
                    size={22}
                    color={themeColors.textPrimary}
                  />
                </TouchableOpacity>
              </View>

              {items.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={40}
                    color={colors.pine}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    You're all caught up.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                >
                  {items.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.notifRow,
                        { borderBottomColor: themeColors.border },
                      ]}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.notifIcon,
                          { backgroundColor: themeColors.bgScreen },
                        ]}
                      >
                        <Ionicons
                          name={ICON_MAP[item.type] || 'notifications-outline'}
                          size={20}
                          color={colors.cobalt}
                        />
                      </View>
                      <View style={styles.notifBody}>
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: themeColors.textPrimary },
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.notifSubtitle,
                            { color: themeColors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.inkSoft}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.heart,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: fonts.ui, fontSize: 10, color: colors.white },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 60,
    marginLeft: 12,
    marginRight: 12,
    maxHeight: 420,
    width: 320,
    shadowColor: tokenColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  panelTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft },
  list: { maxHeight: 340 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBody: { flex: 1 },
  notifTitle: { fontFamily: fonts.label, fontSize: 14, color: colors.ink },
  notifSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 1,
  },
});
