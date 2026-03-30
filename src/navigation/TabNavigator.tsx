import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { MainTabParamList } from './types';
import { RootState } from '../store/store';
import { colors, fonts } from '../theme';
import { HeaderSearchPill } from '../components/navigation/HeaderSearchPill';
import { HeaderUserSelector } from '../components/navigation/HeaderUserSelector';
import { AvatarBottomSheet } from '../components/navigation/AvatarBottomSheet';
import { AvatarSheetProvider } from '../context/AvatarSheetContext';
import { searchEventBus } from '../utils/searchEventBus';

import { HomeStackNavigator } from './stacks/HomeStackNavigator';
import { FacilitiesStackNavigator } from './stacks/FacilitiesStackNavigator';
import { TeamsStackNavigator } from './stacks/TeamsStackNavigator';
import { MessagesStackNavigator } from './stacks/MessagesStackNavigator';
import { LeaguesStackNavigator } from './stacks/LeaguesStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ROOT_SCREENS: Record<string, string> = {
  Home: 'HomeScreen',
  Teams: 'TeamsList',
  Messages: 'ConversationList',
  Leagues: 'LeaguesBrowser',
  Facilities: 'FacilitiesList',
};

function isRootScreen(route: any): boolean {
  const routeName = getFocusedRouteNameFromRoute(route);
  const tabName = route.name as string;
  if (!routeName) return true;
  return routeName === ROOT_SCREENS[tabName];
}

interface TabBadgeProps {
  count?: number;
  showDot?: boolean;
}

const TabBadge: React.FC<TabBadgeProps> = ({ count, showDot }) => {
  if (!count && !showDot) return null;

  return (
    <View style={styles.badge}>
      {count ? (
        <Text style={styles.badgeText}>
          {count > 99 ? '99+' : count.toString()}
        </Text>
      ) : (
        <View style={styles.badgeDot} />
      )}
    </View>
  );
};

/**
 * Custom header component — search pill + avatar in a single flex row.
 * This avoids the headerTitle / headerRight layout fight that causes
 * horizontal overflow on narrow screens.
 */
const SECTION_TITLES: Partial<Record<string, string>> = {
  Messages: 'Messages',
};

function CustomHeader({ routeName }: { routeName: string }) {
  const sectionTitle = SECTION_TITLES[routeName];
  return (
    <View style={styles.headerRow}>
      {sectionTitle ? (
        <Text style={styles.headerSectionTitle}>{sectionTitle}</Text>
      ) : (
        <View style={styles.headerPillWrap}>
          <HeaderSearchPill routeName={routeName} />
        </View>
      )}
      <HeaderUserSelector />
    </View>
  );
}

export function TabNavigator() {
  const unreadCount = useSelector((state: RootState) => state.messaging?.unreadCount ?? 0);

  const getTabBarIcon = (
    route: { name: keyof MainTabParamList },
    focused: boolean,
    color: string,
    size: number
  ) => {
    let iconName: keyof typeof Ionicons.glyphMap;

    if (route.name === 'Facilities') {
      const stadiumIcon = focused ? 'stadium' : 'stadium-outline';
      return (
        <View style={styles.tabIconContainer}>
          <MaterialCommunityIcons
            name={stadiumIcon}
            size={size + 2}
            color={color}
          />
        </View>
      );
    }

    switch (route.name) {
      case 'Home':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'Teams':
        iconName = focused ? 'people' : 'people-outline';
        break;
      case 'Messages':
        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        break;
      case 'Leagues':
        iconName = focused ? 'trophy' : 'trophy-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    return (
      <View style={styles.tabIconContainer}>
        <Ionicons name={iconName} size={size} color={color} />
        {route.name === 'Messages' && unreadCount > 0 && (
          <TabBadge count={unreadCount} />
        )}
      </View>
    );
  };

  return (
    <AvatarSheetProvider>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: true,
            header: () => isRootScreen(route) ? <CustomHeader routeName={route.name} /> : null,
            tabBarIcon: ({ focused, color }) =>
              getTabBarIcon(route, focused, color, 22),
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.outline,
            tabBarShowLabel: true,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarItemStyle: styles.tabBarItem,
            tabBarIconStyle: styles.tabBarIcon,
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeStackNavigator}
            options={{ tabBarLabel: 'Home' }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Home', { screen: 'HomeScreen' });
              },
            })}
          />
          <Tab.Screen
            name="Teams"
            component={TeamsStackNavigator}
            options={{ tabBarLabel: 'Teams' }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Teams', { screen: 'TeamsList' });
              },
            })}
          />
          <Tab.Screen
            name="Messages"
            component={MessagesStackNavigator}
            options={{ tabBarLabel: 'Messages' }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Messages', { screen: 'ConversationList' });
              },
            })}
          />
          <Tab.Screen
            name="Leagues"
            component={LeaguesStackNavigator}
            options={{ tabBarLabel: 'Leagues' }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Leagues', { screen: 'LeaguesBrowser' });
              },
            })}
          />
          <Tab.Screen
            name="Facilities"
            component={FacilitiesStackNavigator}
            options={{ tabBarLabel: 'Grounds' }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Facilities', { screen: 'FacilitiesList' });
              },
            })}
          />
        </Tab.Navigator>
        <AvatarBottomSheet />
      </View>
    </AvatarSheetProvider>
  );
}

const styles = StyleSheet.create({
  // ── Custom header ───────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: colors.background,
    gap: 12,
  },
  headerPillWrap: {
    flex: 1,
  },
  headerSectionTitle: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.onSurface,
  },

  // ── Tab bar ─────────────────────────────
  tabBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 0,
    paddingBottom: 20,
    paddingTop: 8,
    height: 80,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  tabBarLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  tabBarItem: {
    gap: 2,
  },
  tabBarIcon: {
    marginBottom: 0,
  },

  // ── Tab icon ────────────────────────────
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: fonts.label,
    paddingHorizontal: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});
