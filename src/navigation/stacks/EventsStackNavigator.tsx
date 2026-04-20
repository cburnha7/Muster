import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../types';
import { EventsListScreen } from '../../screens/events/EventsListScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { CreateEventScreen } from '../../screens/events/CreateEventScreen';
import { EditEventScreen } from '../../screens/events/EditEventScreen';
import { lightColors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<EventsStackParamList>();

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

export function EventsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventsList" component={EventsListScreen} />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ ...detailHeader, headerTitle: '' }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
