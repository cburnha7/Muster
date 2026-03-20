import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '../src/navigation/RootNavigator';

export default function Index(): JSX.Element {
  return (
    <NavigationContainer independent={true}>
      <RootNavigator />
    </NavigationContainer>
  );
}
