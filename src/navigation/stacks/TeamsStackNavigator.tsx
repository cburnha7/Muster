import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeamsStackParamList } from '../types';
import { TeamsListScreen } from '../../screens/teams/TeamsListScreen';
import { TeamDetailsScreen } from '../../screens/teams/TeamDetailsScreen';
import { CreateTeamScreen } from '../../screens/teams/CreateTeamScreen';
import { JoinTeamScreen } from '../../screens/teams/JoinTeamScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<TeamsStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.cream },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
};

export function TeamsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamsList" component={TeamsListScreen} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ ...detailHeader, headerTitle: 'Roster' }} />
      <Stack.Screen name="CreateTeam" component={CreateTeamScreen} options={{ ...detailHeader, headerTitle: 'New Roster' }} />
      <Stack.Screen name="JoinTeam" component={JoinTeamScreen} options={{ ...detailHeader, headerTitle: 'Join Roster' }} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} options={{ ...detailHeader, headerTitle: 'Event' }} />
    </Stack.Navigator>
  );
}
