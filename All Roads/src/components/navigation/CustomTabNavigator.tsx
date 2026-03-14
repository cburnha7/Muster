import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../../navigation/types';

// Import stack navigators for each tab
import { HomeStackNavigator } from '../../navigation/stacks/HomeStackNavigator';
import { EventsStackNavigator } from '../../navigation/stacks/EventsStackNavigator';
import { FacilitiesStackNavigator } from '../../navigation/stacks/FacilitiesStackNavigator';
import { TeamsStackNavigator } from '../../navigation/stacks/TeamsStackNavigator';
import { BookingsStackNavigator } from '../../navigation/stacks/BookingsStackNavigator';
import { ProfileStackNavigator } from '../../navigation/stacks/ProfileStackNavigator';

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

interface CustomTabNavigatorProps {
  badges?: {
    [key in keyof MainTabParamList]?: {
      count?: number;
      showDot?: boolean;
    };
  };
}

export const CustomTabNavigator: React.FC<CustomTabNavigatorProps> = ({ 
  badges = {} 
}) => {
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
      case 'Events':
        iconName = focused ? 'calendar' : 'calendar-outline';
        break;
      case 'Facilities':
        iconName = focused ? 'location' : 'location-outline';
        break;
      case 'Teams':
        iconName = focused ? 'people' : 'people-outline';
        break;
      case 'Bookings':
        iconName = focused ? 'bookmark' : 'bookmark-outline';
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
        <TabBadge {...badges[route.name]} />
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) =>
          getTabBarIcon(route, focused, color, size),
        tabBarActiveTintColor: '#007AFF',
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
        }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsStackNavigator}
        options={{
          tabBarLabel: 'Events',
        }}
      />
      <Tab.Screen 
        name="Facilities" 
        component={FacilitiesStackNavigator}
        options={{
          tabBarLabel: 'Facilities',
        }}
      />
      <Tab.Screen 
        name="Teams" 
        component={TeamsStackNavigator}
        options={{
          tabBarLabel: 'Rosters',
        }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingsStackNavigator}
        options={{
          tabBarLabel: 'Bookings',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

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