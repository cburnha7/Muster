import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LeaguesStackParamList } from '../types';
import { LeaguesBrowserScreen } from '../../screens/leagues/LeaguesBrowserScreen';
import { LeagueDetailsScreen } from '../../screens/leagues/LeagueDetailsScreen';
import { CreateLeagueScreen } from '../../screens/leagues/CreateLeagueScreen';
import { ManageLeagueScreen } from '../../screens/leagues/ManageLeagueScreen';
import { CreateMatchScreen } from '../../screens/leagues/CreateMatchScreen';
import { RecordMatchResultScreen } from '../../screens/leagues/RecordMatchResultScreen';
import { AssignFacilityScreen } from '../../screens/leagues/AssignFacilityScreen';
import { DocumentViewerScreen } from '../../screens/leagues/DocumentViewerScreen';
import SchedulingScreen from '../../screens/leagues/SchedulingScreen';
import { ScheduleWizardScreen } from '../../screens/leagues/ScheduleWizardScreen';
import { LeagueDeletionConfirmScreen } from '../../screens/leagues/LeagueDeletionConfirmScreen';
import { LeagueTeamManagementScreen } from '../../screens/leagues/LeagueTeamManagementScreen';
import { lightColors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<LeaguesStackParamList>();

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

export function LeaguesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LeaguesBrowser" component={LeaguesBrowserScreen} />
      <Stack.Screen
        name="LeagueDetails"
        component={LeagueDetailsScreen}
        options={{ ...detailHeader, headerTitle: '' }}
      />
      <Stack.Screen
        name="CreateLeague"
        component={CreateLeagueScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageLeague"
        component={ManageLeagueScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RecordMatchResult"
        component={RecordMatchResultScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AssignFacility"
        component={AssignFacilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DocumentViewer"
        component={DocumentViewerScreen}
        options={{ ...detailHeader, headerTitle: 'Document' }}
      />
      <Stack.Screen
        name="LeagueScheduling"
        component={SchedulingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScheduleWizard"
        component={ScheduleWizardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeagueDeletionConfirm"
        component={LeagueDeletionConfirmScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeagueTeamManagement"
        component={LeagueTeamManagementScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
