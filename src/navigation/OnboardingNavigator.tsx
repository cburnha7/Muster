import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { OnboardingStackParamList } from './types';

// Standard onboarding (email/password registration)
import { IntentSelectionScreen } from '../screens/onboarding/IntentSelectionScreen';
import { SportSelectionScreen } from '../screens/onboarding/SportSelectionScreen';
import { LocationSetupScreen } from '../screens/onboarding/LocationSetupScreen';
import { PersonaSetupScreen } from '../screens/onboarding/PersonaSetupScreen';
import { ProfileFinishScreen } from '../screens/onboarding/ProfileFinishScreen';

// SSO onboarding (Apple/Google sign-in)
import { SSOOnboardingFlow } from '../screens/onboarding/SSOOnboardingFlow';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const user = useSelector(selectUser);

  // Determine if this user came from SSO — they'll have ssoProviders set
  const isSSO = user?.ssoProviders && user.ssoProviders.length > 0;

  if (isSSO) {
    // SSO users get the profile-focused flow (name, birthday, location, contact, photo)
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="IntentSelection" component={SSOOnboardingFlow} />
      </Stack.Navigator>
    );
  }

  // Standard users get the intent-focused flow
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
