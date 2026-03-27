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

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEventScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="FacilityDetails" 
        component={FacilityDetailsScreen}
      />
      <Stack.Screen 
        name="SearchResults" 
        component={SearchResultsScreen}
      />
      <Stack.Screen
        name="EventSearchResults"
        component={EventSearchResultsScreen}
      />
      <Stack.Screen 
        name="Debrief" 
        component={DebriefScreen}
      />
      <Stack.Screen
        name="PendingReservationDetails"
        component={PendingReservationDetailsScreen}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}