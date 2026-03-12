import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { HomeScreen } from '../../screens/home/HomeScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { FacilityDetailsScreen } from '../../screens/facilities/FacilityDetailsScreen';
import { SearchResultsScreen } from '../../screens/search/SearchResultsScreen';

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
        name="FacilityDetails" 
        component={FacilityDetailsScreen}
      />
      <Stack.Screen 
        name="SearchResults" 
        component={SearchResultsScreen}
      />
    </Stack.Navigator>
  );
}