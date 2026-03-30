import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FacilitiesStackParamList } from '../types';
import { FacilitiesListScreen } from '../../screens/facilities/FacilitiesListScreen';
import { FacilityDetailsScreen } from '../../screens/facilities/FacilityDetailsScreen';
import { CreateFacilityScreen } from '../../screens/facilities/CreateFacilityScreen';
import { EditFacilityScreen } from '../../screens/facilities/EditFacilityScreen';
import { ManageGroundScreen } from '../../screens/facilities/ManageGroundScreen';
import { AddCourtScreen } from '../../screens/facilities/AddCourtScreen';
import { FacilityMapEditorScreen } from '../../screens/facilities/FacilityMapEditorScreen';
import { GroundAvailabilityScreen } from '../../screens/facilities/GroundAvailabilityScreen';
import { CourtAvailabilityScreen } from '../../screens/facilities/CourtAvailabilityScreen';
import { MyRentalsScreen } from '../../screens/facilities/MyRentalsScreen';
import { CancellationPolicyScreen } from '../../screens/facilities/CancellationPolicyScreen';
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<FacilitiesStackParamList>();

const detailHeader = {
  headerShown: true as const,
  headerBackVisible: false,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.surfaceContainerLowest },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 22, color: colors.onSurface },
};

export function FacilitiesStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FacilitiesList" component={FacilitiesListScreen} />
      <Stack.Screen name="FacilityDetails" component={FacilityDetailsScreen} options={{ ...detailHeader, headerTitle: '' }} />
      <Stack.Screen name="CreateFacility" component={CreateFacilityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditFacility" component={EditFacilityScreen} options={{ ...detailHeader, headerTitle: 'Edit Ground' }} />
      <Stack.Screen name="ManageGround" component={ManageGroundScreen} options={{ ...detailHeader, headerTitle: 'Manage' }} />
      <Stack.Screen name="AddCourt" component={AddCourtScreen} options={{ ...detailHeader, headerTitle: 'Add Court' }} />
      <Stack.Screen name="FacilityMapEditor" component={FacilityMapEditorScreen} options={{ ...detailHeader, headerTitle: 'Map Editor' }} />
      <Stack.Screen name="GroundAvailability" component={GroundAvailabilityScreen} options={{ ...detailHeader, headerTitle: 'Availability' }} />
      <Stack.Screen name="CourtAvailability" component={CourtAvailabilityScreen} options={{ ...detailHeader, headerTitle: 'Court' }} />
      <Stack.Screen name="MyRentals" component={MyRentalsScreen} options={{ ...detailHeader, headerTitle: 'My Rentals' }} />
      <Stack.Screen name="CancellationPolicy" component={CancellationPolicyScreen} options={{ ...detailHeader, headerTitle: 'Policy' }} />
    </Stack.Navigator>
  );
}
