import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingsStackParamList } from '../types';
import { BookingsListScreen } from '../../screens/bookings/BookingsListScreen';
import { BookingDetailsScreen } from '../../screens/bookings/BookingDetailsScreen';
import { BookingHistoryScreen } from '../../screens/bookings/BookingHistoryScreen';
import { DebriefScreen } from '../../screens/debrief/DebriefScreen';

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export function BookingsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers
      }}
    >
      <Stack.Screen 
        name="BookingsList" 
        component={BookingsListScreen}
      />
      <Stack.Screen 
        name="BookingDetails" 
        component={BookingDetailsScreen}
      />
      <Stack.Screen 
        name="BookingHistory" 
        component={BookingHistoryScreen}
      />
      <Stack.Screen 
        name="Debrief" 
        component={DebriefScreen}
      />
    </Stack.Navigator>
  );
}