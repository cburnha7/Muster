import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../types';
import { EventsListScreen } from '../../screens/events/EventsListScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { CreateEventScreen } from '../../screens/events/CreateEventScreen';
import { EditEventScreen } from '../../screens/events/EditEventScreen';

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers
      }}
    >
      <Stack.Screen 
        name="EventsList" 
        component={EventsListScreen}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
      />
      <Stack.Screen 
        name="CreateEvent" 
        component={CreateEventScreen}
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEventScreen}
      />
    </Stack.Navigator>
  );
}