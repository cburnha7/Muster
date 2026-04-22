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
import { FacilityRentalsScreen } from '../../screens/facilities/FacilityRentalsScreen';
import { EscrowTransactionsScreen } from '../../screens/facilities/EscrowTransactionsScreen';
import { lightColors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<FacilitiesStackParamList>();

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

export function FacilitiesStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FacilitiesList" component={FacilitiesListScreen} />
      <Stack.Screen
        name="FacilityDetails"
        component={FacilityDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateFacility"
        component={CreateFacilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditFacility"
        component={EditFacilityScreen}
        options={{
          ...detailHeader,
          headerTitle: 'Edit Ground',
        }}
      />
      <Stack.Screen
        name="ManageGround"
        component={ManageGroundScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddCourt"
        component={AddCourtScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FacilityMapEditor"
        component={FacilityMapEditorScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroundAvailability"
        component={GroundAvailabilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourtAvailability"
        component={CourtAvailabilityScreen}
        options={{ ...detailHeader, headerTitle: 'Court' }}
      />
      <Stack.Screen
        name="MyRentals"
        component={MyRentalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CancellationPolicy"
        component={CancellationPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FacilityRentals"
        component={FacilityRentalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EscrowTransactions"
        component={EscrowTransactionsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
