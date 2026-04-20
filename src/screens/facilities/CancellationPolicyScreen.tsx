import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { CancellationPolicyForm } from '../../components/facilities/CancellationPolicyForm';
import { useTheme } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';

type CancellationPolicyScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'CancellationPolicy'
>;
type CancellationPolicyScreenRouteProp = RouteProp<
  FacilitiesStackParamList,
  'CancellationPolicy'
>;

export function CancellationPolicyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<CancellationPolicyScreenNavigationProp>();
  const route = useRoute<CancellationPolicyScreenRouteProp>();
  const { facilityId } = route.params ?? {};

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Cancellation Policy"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />
      <CancellationPolicyForm
        facilityId={facilityId}
        onSaved={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
