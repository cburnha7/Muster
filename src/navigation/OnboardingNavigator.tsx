import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { IntentSelectionScreen } from '../screens/onboarding/IntentSelectionScreen';
import { SportSelectionScreen } from '../screens/onboarding/SportSelectionScreen';
import { LocationSetupScreen } from '../screens/onboarding/LocationSetupScreen';
import { PersonaSetupScreen } from '../screens/onboarding/PersonaSetupScreen';
import { ProfileFinishScreen } from '../screens/onboarding/ProfileFinishScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="IntentSelection" component={IntentSelectionScreen} />
      <Stack.Screen name="SportSelection" component={SportSelectionScreen} />
      <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
      <Stack.Screen name="PersonaSetup" component={PersonaSetupScreen} />
      <Stack.Screen name="ProfileFinish" component={ProfileFinishScreen} />
    </Stack.Navigator>
  );
}
