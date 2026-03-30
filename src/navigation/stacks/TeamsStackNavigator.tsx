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
  headerStyle: { backgroundColor: colors.surfaceContainerLowest },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 22, color: colors.onSurface },
};

export function TeamsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamsList" component={TeamsListScreen} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ ...detailHeader, headerTitle: '' }} />
      <Stack.Screen name="CreateTeam" component={CreateTeamScreen} options={{ headerShown: false }} />
      <Stack.Screen name="JoinTeam" component={JoinTeamScreen} options={{ ...detailHeader, headerTitle: 'Join Team' }} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} options={{ ...detailHeader, headerTitle: '' }} />
    </Stack.Navigator>
  );
}
