import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { FormButton } from '../../components/forms/FormButton';
import { MapImageUploader } from '../../components/facilities/MapImageUploader';
import { facilityService } from '../../services/api/FacilityService';
import { Spacing, BorderRadius, useTheme } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';

type FacilityMapEditorScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'FacilityMapEditor'
>;
type FacilityMapEditorScreenRouteProp = RouteProp<
  FacilitiesStackParamList,
  'FacilityMapEditor'
>;

export function FacilityMapEditorScreen(): JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<FacilityMapEditorScreenNavigationProp>();
  const route = useRoute<FacilityMapEditorScreenRouteProp>();
  const { facilityId, currentMapUrl } = route.params ?? {};

  const [mapImageUri, setMapImageUri] = useState<string | undefined>(
    currentMapUrl
  );
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleImageSelected = (uri: string) => {
    setMapImageUri(uri);
    setHasChanges(true);
  };

  const handleImageRemoved = () => {
    setMapImageUri(undefined);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    try {
      setUploading(true);

      if (mapImageUri && mapImageUri !== currentMapUrl) {
        // Upload new map image
        const response = await fetch(mapImageUri);
        const blob = await response.blob();
        const file = new File([blob], 'facility-map.jpg', {
          type: 'image/jpeg',
        });

        // Upload the map image
        const imageUrls = await facilityService.uploadFacilityImages(
          facilityId,
          [file]
        );

        // Update facility with the new map URL
        await facilityService.updateFacility(facilityId, {
          facilityMapUrl: imageUrls[0] || null,
        });

        Alert.alert('Success', 'Ground map uploaded successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (!mapImageUri && currentMapUrl) {
        // Remove the map
        await facilityService.updateFacility(facilityId, {
          facilityMapUrl: null,
        });

        Alert.alert('Success', 'Ground map removed', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save ground map');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Facility Map"
        leftIcon="arrow-back"
        onLeftPress={handleCancel}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map Image Uploader */}
        <MapImageUploader
          imageUri={mapImageUri}
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
          disabled={uploading}
          showInstructions={true}
        />

        {/* Next Steps */}
        {mapImageUri && (
          <View style={[styles.nextStepsCard, { backgroundColor: colors.background, borderColor: colors.border, borderLeftColor: colors.cobalt }]}>
            <Text style={[styles.nextStepsTitle, { color: colors.ink }]}>Next Steps</Text>
            <Text style={[styles.nextStepsText, { color: colors.mid }]}>
              After saving the map, you can define court boundaries to help
              users identify specific courts and fields on your facility.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <FormButton
          title="Cancel"
          variant="outline"
          onPress={handleCancel}
          style={styles.actionButton}
          disabled={uploading}
        />
        <FormButton
          title={uploading ? 'Saving...' : 'Save Map'}
          onPress={handleSave}
          style={styles.actionButton}
          loading={uploading}
          disabled={uploading || !hasChanges}
        />
      </View>

      {/* Loading Overlay */}
      {uploading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.background }]}>
            <LoadingSpinner />
            <Text style={[styles.loadingText, { color: colors.ink }]}>Uploading facility map...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  nextStepsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginTop: Spacing.xl,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  nextStepsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 16,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
