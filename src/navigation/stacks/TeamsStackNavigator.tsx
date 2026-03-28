import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeamsStackParamList } from '../types';
import { TeamsListScreen } from '../../screens/teams/TeamsListScreen';
import { TeamDetailsScreen } from '../../screens/teams/TeamDetailsScreen';
import { CreateTeamScreen } from '../../screens/teams/CreateTeamScreen';
import { JoinTeamScreen } from '../../screens/teams/JoinTeamScreen';
import { EventDetailsScreen } from '../../screens/events/EventDetailsScreen';

const Stack = createNativeStackNavigator<TeamsStackParamList>();

export function TeamsStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers
      }}
    >
      <Stack.Screen 
        name="TeamsList" 
        component={TeamsListScreen}
      />
      <Stack.Screen 
        name="TeamDetails" 
        component={TeamDetailsScreen}
      />
      <Stack.Screen 
        name="CreateTeam" 
        component={CreateTeamScreen}
      />
      <Stack.Screen 
        name="JoinTeam" 
        component={JoinTeamScreen}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
      />
    </Stack.Navigator>
  );
}