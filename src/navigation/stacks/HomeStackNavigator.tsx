import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { HomeScreen } from '../../screens/home/HomeScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { EditEventScreen } from '../../screens/events/EditEventScreen';
import { FacilityDetailsScreen } from '../../screens/facilities/FacilityDetailsScreen';
import { SearchResultsScreen } from '../../screens/search/SearchResultsScreen';
import { EventSearchResultsScreen } from '../../screens/home/EventSearchResultsScreen';
import { DebriefScreen } from '../../screens/debrief/DebriefScreen';
import { PendingReservationDetailsScreen } from '../../screens/facilities/PendingReservationDetailsScreen';
import { CreateEventScreen } from '../../screens/events/CreateEventScreen';
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../../screens/profile/EditProfileScreen';
import { DependentProfileScreen } from '../../screens/profile/DependentProfileScreen';
import { DependentFormScreen } from '../../screens/profile/DependentFormScreen';
import { SettingsScreen } from '../../screens/profile/SettingsScreen';
import { NotificationPreferencesScreen } from '../../screens/profile/NotificationPreferencesScreen';
import { TransferAccountScreen } from '../../screens/profile/TransferAccountScreen';
import { RedeemCodeScreen } from '../../screens/profile/RedeemCodeScreen';
import { AvailabilityCalendarScreen } from '../../screens/profile/AvailabilityCalendarScreen';
import { lightColors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerBackTitleVisible: false,
  headerTintColor: lightColors.ink,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: lightColors.background },
  headerShadowVisible: false,
  headerTitleStyle: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: lightColors.ink,
  },
};

export function HomeStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ ...detailHeader, headerTitle: '' }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FacilityDetails"
        component={FacilityDetailsScreen}
        options={{ ...detailHeader, headerTitle: '' }}
      />
      <Stack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={{ ...detailHeader, headerTitle: 'Search' }}
      />
      <Stack.Screen
        name="EventSearchResults"
        component={EventSearchResultsScreen}
        options={{ ...detailHeader, headerTitle: 'Results' }}
      />
      <Stack.Screen
        name="Debrief"
        component={DebriefScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PendingReservationDetails"
        component={PendingReservationDetailsScreen}
        options={{ ...detailHeader, headerTitle: 'Reservation' }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ headerShown: false }}
      />
      {/* Profile screens — inside tab stack so tab bar stays visible */}
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ ...detailHeader, headerTitle: 'Profile' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ ...detailHeader, headerTitle: 'Edit Profile' }}
      />
      <Stack.Screen
        name="DependentProfile"
        component={DependentProfileScreen}
        options={{ ...detailHeader, headerTitle: 'Dependent' }}
      />
      <Stack.Screen
        name="DependentForm"
        component={DependentFormScreen}
        options={{ ...detailHeader, headerTitle: 'Dependent' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ ...detailHeader, headerTitle: 'Settings' }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ ...detailHeader, headerTitle: 'Notifications' }}
      />
      <Stack.Screen
        name="TransferAccount"
        component={TransferAccountScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RedeemCode"
        component={RedeemCodeScreen}
        options={{ ...detailHeader, headerTitle: 'Redeem Code' }}
      />
      <Stack.Screen
        name="AvailabilityCalendar"
        component={AvailabilityCalendarScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
