import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LeaguesStackParamList } from '../types';

// Import screens
import { LeaguesBrowserScreen } from '../../screens/leagues/LeaguesBrowserScreen';
import { LeagueDetailsScreen } from '../../screens/leagues/LeagueDetailsScreen';
import { CreateLeagueScreen } from '../../screens/leagues/CreateLeagueScreen';
import { ManageLeagueScreen } from '../../screens/leagues/ManageLeagueScreen';
import { CreateMatchScreen } from '../../screens/leagues/CreateMatchScreen';
import { RecordMatchResultScreen } from '../../screens/leagues/RecordMatchResultScreen';
import { AssignFacilityScreen } from '../../screens/leagues/AssignFacilityScreen';
import { DocumentViewerScreen } from '../../screens/leagues/DocumentViewerScreen';
import SchedulingScreen from '../../screens/leagues/SchedulingScreen';
import { LeagueDeletionConfirmScreen } from '../../screens/leagues/LeagueDeletionConfirmScreen';

const Stack = createNativeStackNavigator<LeaguesStackParamList>();

export function LeaguesStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="LeaguesBrowser"
        component={LeaguesBrowserScreen}
      />
      <Stack.Screen
        name="LeagueDetails"
        component={LeagueDetailsScreen}
      />
      <Stack.Screen
        name="CreateLeague"
        component={CreateLeagueScreen}
      />
      <Stack.Screen
        name="ManageLeague"
        component={ManageLeagueScreen}
      />
      <Stack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
      />
      <Stack.Screen
        name="RecordMatchResult"
        component={RecordMatchResultScreen}
      />
      <Stack.Screen
        name="AssignFacility"
        component={AssignFacilityScreen}
      />
      <Stack.Screen
        name="DocumentViewer"
        component={DocumentViewerScreen}
        options={{
          headerShown: true,
          title: 'Document',
        }}
      />
      <Stack.Screen
        name="LeagueScheduling"
        component={SchedulingScreen}
      />
      <Stack.Screen
        name="LeagueDeletionConfirm"
        component={LeagueDeletionConfirmScreen}
      />
    </Stack.Navigator>
  );
}
