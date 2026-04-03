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
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: true,
  headerBackTitleVisible: false,
  headerTintColor: colors.onSurface,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleStyle: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: colors.onSurface,
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
    </Stack.Navigator>
  );
}
