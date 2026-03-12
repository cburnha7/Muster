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

const Stack = createNativeStackNavigator<FacilitiesStackParamList>();

export function FacilitiesStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We'll use custom headers
      }}
    >
      <Stack.Screen 
        name="FacilitiesList" 
        component={FacilitiesListScreen}
      />
      <Stack.Screen 
        name="FacilityDetails" 
        component={FacilityDetailsScreen}
      />
      <Stack.Screen 
        name="CreateFacility" 
        component={CreateFacilityScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="EditFacility" 
        component={EditFacilityScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="ManageGround" 
        component={ManageGroundScreen}
      />
      <Stack.Screen 
        name="AddCourt" 
        component={AddCourtScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="FacilityMapEditor" 
        component={FacilityMapEditorScreen}
      />
      <Stack.Screen 
        name="GroundAvailability" 
        component={GroundAvailabilityScreen}
      />
      <Stack.Screen 
        name="CourtAvailability" 
        component={CourtAvailabilityScreen}
      />
      <Stack.Screen 
        name="MyRentals" 
        component={MyRentalsScreen}
      />
    </Stack.Navigator>
  );
}