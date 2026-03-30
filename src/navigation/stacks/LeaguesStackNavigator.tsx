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
import { LeagueDeletionConfirmScreen } from '../../screens/leagues/LeagueDeletionConfirmScreen';
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<LeaguesStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.surfaceContainerLowest },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 22, color: colors.onSurface },
};

export function LeaguesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LeaguesBrowser" component={LeaguesBrowserScreen} />
      <Stack.Screen name="LeagueDetails" component={LeagueDetailsScreen} options={{ ...detailHeader, headerTitle: '' }} />
      <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManageLeague" component={ManageLeagueScreen} options={{ ...detailHeader, headerTitle: 'Manage' }} />
      <Stack.Screen name="CreateMatch" component={CreateMatchScreen} options={{ ...detailHeader, headerTitle: 'New Match' }} />
      <Stack.Screen name="RecordMatchResult" component={RecordMatchResultScreen} options={{ ...detailHeader, headerTitle: 'Record Result' }} />
      <Stack.Screen name="AssignFacility" component={AssignFacilityScreen} options={{ ...detailHeader, headerTitle: 'Assign Ground' }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ ...detailHeader, headerTitle: 'Document' }} />
      <Stack.Screen name="LeagueScheduling" component={SchedulingScreen} options={{ ...detailHeader, headerTitle: 'Schedule' }} />
      <Stack.Screen name="LeagueDeletionConfirm" component={LeagueDeletionConfirmScreen} options={{ ...detailHeader, headerTitle: 'Delete League' }} />
    </Stack.Navigator>
  );
}
