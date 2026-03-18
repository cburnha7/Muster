import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../types';
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../../screens/profile/SettingsScreen';
import { NotificationPreferencesScreen } from '../../screens/profile/NotificationPreferencesScreen';
import { UserStatsScreen } from '../../screens/profile/UserStatsScreen';
import { BookingHistoryScreen } from '../../screens/bookings/BookingHistoryScreen';
import { DependentFormScreen } from '../../screens/profile/DependentFormScreen';
import { DependentProfileScreen } from '../../screens/profile/DependentProfileScreen';
import { TransferAccountScreen } from '../../screens/profile/TransferAccountScreen';
import { RedeemCodeScreen } from '../../screens/profile/RedeemCodeScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers
      }}
    >
      <Stack.Screen 
        name="ProfileScreen" 
        component={ProfileScreen}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
      />
      <Stack.Screen 
        name="NotificationPreferences" 
        component={NotificationPreferencesScreen}
      />
      <Stack.Screen 
        name="UserStats" 
        component={UserStatsScreen}
      />
      <Stack.Screen 
        name="BookingHistory" 
        component={BookingHistoryScreen}
      />
      <Stack.Screen 
        name="DependentForm" 
        component={DependentFormScreen}
      />
      <Stack.Screen 
        name="DependentProfile" 
        component={DependentProfileScreen}
      />
      <Stack.Screen 
        name="TransferAccount" 
        component={TransferAccountScreen}
      />
      <Stack.Screen 
        name="RedeemCode" 
        component={RedeemCodeScreen}
      />
    </Stack.Navigator>
  );
}