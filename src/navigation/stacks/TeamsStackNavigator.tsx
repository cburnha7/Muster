import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeamsStackParamList } from '../types';
import { TeamsListScreen } from '../../screens/teams/TeamsListScreen';
import { TeamDetailsScreen } from '../../screens/teams/TeamDetailsScreen';
import { CreateTeamScreen } from '../../screens/teams/CreateTeamScreen';
import { JoinTeamScreen } from '../../screens/teams/JoinTeamScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';
import { ScheduleReviewScreen } from '../../screens/teams/ScheduleReviewScreen';
import { lightColors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<TeamsStackParamList>();

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

export function TeamsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamsList" component={TeamsListScreen} />
      <Stack.Screen
        name="TeamDetails"
        component={TeamDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTeam"
        component={CreateTeamScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="JoinTeam"
        component={JoinTeamScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScheduleReview"
        component={ScheduleReviewScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
