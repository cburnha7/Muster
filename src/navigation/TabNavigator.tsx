import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { RootState } from '../store/store';
import { useTheme } from '../theme';
import { HeaderSearchPill } from '../components/navigation/HeaderSearchPill';
import { HeaderUserSelector } from '../components/navigation/HeaderUserSelector';
import { NotificationBell } from '../components/navigation/NotificationBell';
import { AvatarBottomSheet } from '../components/navigation/AvatarBottomSheet';
import { AvatarSheetProvider } from '../context/AvatarSheetContext';
import { searchEventBus } from '../utils/searchEventBus';

import { HomeStackNavigator } from './stacks/HomeStackNavigator';
import { FacilitiesStackNavigator } from './stacks/FacilitiesStackNavigator';
import { TeamsStackNavigator } from './stacks/TeamsStackNavigator';
import { MessagesStackNavigator } from './stacks/MessagesStackNavigator';
import { LeaguesStackNavigator } from './stacks/LeaguesStackNavigator';
import { ErrorBoundary } from '../components/error/ErrorBoundary';

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

const SECTION_TITLES: Partial<Record<string, string>> = {
  // All tabs now use the search pill header
};

function CustomHeader({ routeName }: { routeName: string }) {
  const { colors, type, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const sectionTitle = SECTION_TITLES[routeName];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing.xl,
        backgroundColor: colors.header,
        borderBottomWidth: 1,
        borderBottomColor: colors.headerBorder,
        gap: spacing.md,
        zIndex: 10,
      }}
    >
      <NotificationBell />
      {sectionTitle ? (
        <Text style={{ ...type.heading, color: colors.textPrimary, flex: 1 }}>
          {sectionTitle}
        </Text>
      ) : (
        <View style={{ flex: 1, marginHorizontal: 4, overflow: 'visible' }}>
          <HeaderSearchPill routeName={routeName} />
        </View>
      )}
      <HeaderUserSelector />
    </View>
  );
}

function withErrorBoundary(Screen: React.ComponentType<any>) {
  return (props: any) => (
    <ErrorBoundary>
      <Screen {...props} />
    </ErrorBoundary>
  );
}

export function TabNavigator() {
  const { colors, type, spacing } = useTheme();
  const unreadCount = useSelector(
    (state: RootState) => state.messaging?.unreadCount ?? 0
  );

  const getTabBarIcon = (
    route: { name: keyof MainTabParamList },
    focused: boolean,
    color: string,
    size: number
  ) => {
    let iconName: keyof typeof Ionicons.glyphMap;
    switch (route.name) {
      case 'Home':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'Teams':
        iconName = focused ? 'people' : 'people-outline';
        break;
      case 'Messages':
        iconName = focused ? 'chatbubble' : 'chatbubble-outline';
        break;
      case 'Leagues':
        iconName = focused ? 'trophy' : 'trophy-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    if (route.name === 'Facilities') {
      return (
        <View style={s.tabIconContainer}>
          <MaterialCommunityIcons
            name={focused ? 'stadium' : 'stadium-outline'}
            size={size - 1}
            color={color}
          />
        </View>
      );
    }

    return (
      <View style={s.tabIconContainer}>
        <Ionicons name={iconName} size={size} color={color} />
        {route.name === 'Messages' && unreadCount > 0 && (
          <View
            style={[
              s.badge,
              { backgroundColor: colors.heart, borderColor: colors.tabBar },
            ]}
          >
            <Text style={[s.badgeText, { ...type.labelSm }]}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
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
            header: () =>
              isRootScreen(route) ? (
                <CustomHeader routeName={route.name} />
              ) : null,
            tabBarIcon: ({ focused, color }) =>
              getTabBarIcon(route, focused, color, 24),
            tabBarActiveTintColor: colors.cobalt,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarShowLabel: true,
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: 1,
              height: 72,
              paddingBottom: 12,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 10,
              letterSpacing: 0.4,
              marginTop: 2,
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={withErrorBoundary(HomeStackNavigator)}
            options={{ tabBarLabel: 'Home' }}
            listeners={({ navigation }) => ({
              tabPress: e => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Home', { screen: 'HomeScreen' });
              },
            })}
          />
          <Tab.Screen
            name="Teams"
            component={withErrorBoundary(TeamsStackNavigator)}
            options={{ tabBarLabel: 'Rosters' }}
            listeners={({ navigation }) => ({
              tabPress: e => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Teams', { screen: 'TeamsList' });
              },
            })}
          />
          <Tab.Screen
            name="Messages"
            component={withErrorBoundary(MessagesStackNavigator)}
            options={{ tabBarLabel: 'Messages' }}
            listeners={({ navigation }) => ({
              tabPress: e => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Messages', { screen: 'ConversationList' });
              },
            })}
          />
          <Tab.Screen
            name="Leagues"
            component={withErrorBoundary(LeaguesStackNavigator)}
            options={{ tabBarLabel: 'Leagues' }}
            listeners={({ navigation }) => ({
              tabPress: e => {
                e.preventDefault();
                searchEventBus.emitClose();
                navigation.navigate('Leagues', { screen: 'LeaguesBrowser' });
              },
            })}
          />
          <Tab.Screen
            name="Facilities"
            component={withErrorBoundary(FacilitiesStackNavigator)}
            options={{ tabBarLabel: 'Grounds' }}
            listeners={({ navigation }) => ({
              tabPress: e => {
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

const s = StyleSheet.create({
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: { color: '#FFFFFF', paddingHorizontal: 4 },
});
