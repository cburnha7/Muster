import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../../navigation/types';
import { useTheme } from '../../theme';

// Import stack navigators for each tab
import { HomeStackNavigator } from '../../navigation/stacks/HomeStackNavigator';
import { FacilitiesStackNavigator } from '../../navigation/stacks/FacilitiesStackNavigator';
import { TeamsStackNavigator } from '../../navigation/stacks/TeamsStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabBadgeProps {
  count?: number;
  showDot?: boolean;
}

function TabBadgeInner({ count, showDot }: TabBadgeProps) {
  const { colors } = useTheme();
  if (!count && !showDot) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.error, borderColor: colors.white },
      ]}
    >
      {count ? (
        <Text style={[styles.badgeText, { color: colors.white }]}>
          {count > 99 ? '99+' : count.toString()}
        </Text>
      ) : (
        <View style={[styles.badgeDot, { backgroundColor: colors.error }]} />
      )}
    </View>
  );
}

interface CustomTabNavigatorProps {
  badges?: {
    [key in keyof MainTabParamList]?: {
      count?: number;
      showDot?: boolean;
    };
  };
}

export const CustomTabNavigator: React.FC<CustomTabNavigatorProps> = ({
  badges = {},
}) => {
  const { colors, shadow } = useTheme();

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
      case 'Facilities':
        iconName = focused ? 'location' : 'location-outline';
        break;
      case 'Teams':
        iconName = focused ? 'people' : 'people-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    return (
      <View style={styles.tabIconContainer}>
        <Ionicons name={iconName} size={size} color={color} />
        <TabBadgeInner {...badges[route.name]} />
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) =>
          getTabBarIcon(route, focused, color, size),
        tabBarActiveTintColor: colors.cobalt,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          shadowColor: colors.black,
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
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
