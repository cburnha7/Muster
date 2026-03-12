import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';

// Import onboarding screens (to be created in task 4.2)
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { FeatureOverviewScreen } from '../screens/onboarding/FeatureOverviewScreen';
import { GetStartedScreen } from '../screens/onboarding/GetStartedScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps): JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
      />
      <Stack.Screen 
        name="FeatureOverview" 
        component={FeatureOverviewScreen}
      />
      <Stack.Screen name="GetStarted">
        {(props) => (
          <GetStartedScreen
            {...props}
            onComplete={onComplete}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}