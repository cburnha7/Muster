import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../types';
import { EventsListScreen } from '../../screens/events/EventsListScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { CreateEventScreen } from '../../screens/events/CreateEventScreen';
import { EditEventScreen } from '../../screens/events/EditEventScreen';
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<EventsStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.white },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 22, color: colors.ink },
};

export function EventsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventsList" component={EventsListScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} options={{ ...detailHeader, headerTitle: 'Event' }} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ ...detailHeader, headerTitle: 'New Event' }} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} options={{ ...detailHeader, headerTitle: 'Edit Event' }} />
    </Stack.Navigator>
  );
}
