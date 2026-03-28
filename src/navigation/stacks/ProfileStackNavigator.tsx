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
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.cream },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
};

export function ProfileStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ ...detailHeader, headerTitle: 'Edit Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ ...detailHeader, headerTitle: 'Settings' }} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ ...detailHeader, headerTitle: 'Notifications' }} />
      <Stack.Screen name="UserStats" component={UserStatsScreen} options={{ ...detailHeader, headerTitle: 'Stats' }} />
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} options={{ ...detailHeader, headerTitle: 'History' }} />
      <Stack.Screen name="DependentForm" component={DependentFormScreen} options={{ ...detailHeader, headerTitle: 'Dependent' }} />
      <Stack.Screen name="DependentProfile" component={DependentProfileScreen} options={{ ...detailHeader, headerTitle: 'Dependent' }} />
      <Stack.Screen name="TransferAccount" component={TransferAccountScreen} options={{ ...detailHeader, headerTitle: 'Transfer' }} />
      <Stack.Screen name="RedeemCode" component={RedeemCodeScreen} options={{ ...detailHeader, headerTitle: 'Redeem Code' }} />
    </Stack.Navigator>
  );
}
