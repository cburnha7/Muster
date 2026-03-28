import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { MainTabParamList } from './types';
import { RootState } from '../store/store';
import { colors } from '../theme';
import { HeaderSearchPill } from '../components/navigation/HeaderSearchPill';
import { HeaderUserSelector } from '../components/navigation/HeaderUserSelector';
import { searchEventBus } from '../utils/searchEventBus';

// Direct imports instead of lazy loading for web compatibility
import { HomeStackNavigator } from './stacks/HomeStackNavigator';
import { FacilitiesStackNavigator } from './stacks/FacilitiesStackNavigator';
import { TeamsStackNavigator } from './stacks/TeamsStackNavigator';
import { LeaguesStackNavigator } from './stacks/LeaguesStackNavigator';
import { ProfileStackNavigator } from './stacks/ProfileStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

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

export function TabNavigator(): JSX.Element {
  // Get badge counts from Redux store
  const bookingsCount = useSelector((state: RootState) => 
    state.bookings.bookings?.filter(booking => booking.status === 'confirmed').length || 0
  );

  const getTabBarIcon = (
    route: { name: keyof MainTabParamList },
    focused: boolean,
    color: string,
    size: number
  ) => {
    let iconName: keyof typeof Ionicons.glyphMap;
    let badgeCount: number | undefined;
    let showBadgeDot = false;

    switch (route.name) {
      case 'Home':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'Facilities':
        iconName = focused ? 'map' : 'map-outline';
        break;
      case 'Teams':
        iconName = focused ? 'people' : 'people-outline';
        break;
      case 'Leagues':
        iconName = focused ? 'trophy' : 'trophy-outline';
        break;
      case 'Profile':
        iconName = focused ? 'person' : 'person-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    return (
      <View style={styles.tabIconContainer}>
        <Ionicons name={iconName} size={size} color={color} />
        <TabBadge count={badgeCount} showDot={showBadgeDot} />
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: () => <HeaderSearchPill routeName={route.name} />,
        headerStyle: {
          backgroundColor: colors.cream,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 0,
          height: 110,
        },
        headerTitleAlign: 'center',
        headerTitleContainerStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerLeft: () => null,
        tabBarIcon: ({ focused, color, size }) =>
          getTabBarIcon(route, focused, color, size),
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          headerRight: () => <HeaderUserSelector />,
          headerRightContainerStyle: { paddingRight: 16 },
        }}
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
        options={{
          tabBarLabel: 'Rosters',
          headerRight: () => <HeaderUserSelector />,
          headerRightContainerStyle: { paddingRight: 16 },
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            searchEventBus.emitClose();
            navigation.navigate('Teams', { screen: 'TeamsList' });
          },
        })}
      />
      <Tab.Screen 
        name="Leagues" 
        component={LeaguesStackNavigator}
        options={{
          tabBarLabel: 'Leagues',
        }}
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
        options={{
          tabBarLabel: 'Grounds',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            searchEventBus.emitClose();
            navigation.navigate('Facilities', { screen: 'FacilitiesList' });
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            searchEventBus.emitClose();
            navigation.navigate('Profile', { screen: 'ProfileScreen' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
});