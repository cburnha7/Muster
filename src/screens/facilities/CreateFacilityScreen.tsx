import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { facilityService } from '../../services/api/FacilityService';
import TokenStorage from '../../services/auth/TokenStorage';
import { API_BASE_URL } from '../../services/api/config';
import { courtService } from '../../services/api/CourtService';
import {
  addFacility,
  selectFacilities,
} from '../../store/slices/facilitiesSlice';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { getSportEmoji } from '../../constants/sports';
import { Facility } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { fonts, Spacing, useTheme } from '../../theme';

import {
  CreateFacilityProvider,
  useCreateFacility,
} from './create-flow/CreateFacilityContext';
import { FacilityFlowContainer } from './create-flow/FacilityFlowContainer';
import { Step1NameSports } from './create-flow/Step1NameSports';
import { Step2Location } from './create-flow/Step2Location';
import { Step3Contact } from './create-flow/Step3Contact';
import { Step4Courts } from './create-flow/Step4Courts';
import { Step5Policies } from './create-flow/Step5Policies';

// ── Inner component (needs context) ──

let isCreatingFacility = false;

function CreateFacilityInner() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const reduxDispatch = useDispatch();
  const { user } = useAuth();
  const allFacilities = useSelector(selectFacilities);
  const userFacilityCount = allFacilities.filter(
    f => f.ownerId === user?.id
  ).length;

  const { allowed: basicAllowed, requiredPlan: basicPlan } =
    useFeatureGate('facility_basic');
  const { allowed: proAllowed, requiredPlan: proPlan } =
    useFeatureGate('facility_pro');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] =
    useState<SubscriptionPlan>('facility_basic');

  const [duplicates, setDuplicates] = useState<Facility[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const { state, dispatch } = useCreateFacility();
  const isSubmittingRef = React.useRef(false);

  // ── Create facility API call ──

  const createFacility = useCallback(async () => {
    const facilityData = {
      name: state.name,
      description: '',
      sportTypes: state.sportTypes,
      amenities: [],
      street: state.street,
      city: state.city,
      state: state.state,
      zipCode: state.zipCode,
      latitude: state.latitude || 0,
      longitude: state.longitude || 0,
      contactName: state.contactName,
      contactPhone: state.contactPhone,
      contactEmail: state.contactEmail,
      contactWebsite: state.contactWebsite,
      pricePerHour: 0,
      rating: 0,
      isVerified: false,
      verificationStatus: 'pending' as const,
      minimumBookingHours: 1,
      bufferTimeMins: 0,
      ownerId: user?.id,
      hoursOfOperation:
        state.hoursOfOperation.length > 0 ? state.hoursOfOperation : undefined,
      cancellationPolicyHours: state.cancellationPolicyHours,
      requiresInsurance: state.requiresInsurance,
      requiresBookingConfirmation: state.requiresBookingConfirmation,
      waiverRequired: state.waiverRequired,
      waiverText: state.waiverRequired ? state.waiverFileName : '',
      ...(state.coverImageUrl ? { coverImageUrl: state.coverImageUrl } : {}),
      ...(state.fieldMapUrl ? { facilityMapUrl: state.fieldMapUrl } : {}),
    };

    const newFacility = await facilityService.createFacility(
      facilityData as any
    );

    // Create courts
    const createdCourts = [];
    for (let i = 0; i < state.courts.length; i++) {
      const court = state.courts[i];
      if (court) {
        const created = await courtService.createCourt(newFacility.id, {
          name: court.name,
          sportType: court.sportType,
          capacity: court.capacity,
          isIndoor: court.isIndoor,
          pricePerHour: court.pricePerHour,
          displayOrder: i,
        });
        createdCourts.push(created);
      }
    }

    // Save photos — already uploaded to R2, just save URLs to facility record
    if (state.pendingPhotos.length > 0) {
      try {
        const token = await TokenStorage.getAccessToken();
        for (const photo of state.pendingPhotos) {
          await fetch(
            `${API_BASE_URL}/facilities/${newFacility.id}/photos/url`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ imageUrl: photo.uri }),
            }
          );
        }
      } catch (uploadErr: any) {
        Alert.alert(
          'Ground created',
          'Your ground was created successfully, but some photos could not be saved. You can add them from the Edit screen.'
        );
        reduxDispatch(
          addFacility({ ...newFacility, courts: createdCourts } as any)
        );
        dispatch({ type: 'SUBMIT_SUCCESS', facilityId: newFacility.id });
        isSubmittingRef.current = false;
        isCreatingFacility = false;
        return;
      }
    }

    // Task 8.2 — upload pending map
    if (state.pendingMapFile) {
      try {
        await facilityService.uploadFacilityMap(
          newFacility.id,
          state.pendingMapFile
        );
      } catch (uploadErr: any) {
        // Task 8.3 — facility created but map upload failed
        Alert.alert(
          'Ground created',
          'Your ground was created successfully, but the facility map could not be uploaded. You can add it from the Edit screen.'
        );
        reduxDispatch(
          addFacility({ ...newFacility, courts: createdCourts } as any)
        );
        dispatch({ type: 'SUBMIT_SUCCESS', facilityId: newFacility.id });
        isSubmittingRef.current = false;
        isCreatingFacility = false;
        return;
      }
    }

    reduxDispatch(
      addFacility({ ...newFacility, courts: createdCourts } as any)
    );
    dispatch({ type: 'SUBMIT_SUCCESS', facilityId: newFacility.id });
    isSubmittingRef.current = false;
    isCreatingFacility = false;
  }, [state, user, reduxDispatch, dispatch]);

  // ── Submit handler ──

  const handleSubmit = useCallback(async () => {
    if (state.isSubmitting || isSubmittingRef.current || isCreatingFacility)
      return;

    // Feature gate checks
    if (userFacilityCount >= 3 && !proAllowed) {
      setUpsellPlan(proPlan);
      setShowUpsell(true);
      return;
    }
    if (!basicAllowed) {
      setUpsellPlan(basicPlan);
      setShowUpsell(true);
      return;
    }

    try {
      dispatch({ type: 'SUBMIT_START' });
      isSubmittingRef.current = true;
      isCreatingFacility = true;

      // Duplicate check
      const duplicateCheck = await facilityService.checkDuplicates({
        street: state.street,
        city: state.city,
        state: state.state,
        zipCode: state.zipCode,
      });

      if (duplicateCheck.length > 0) {
        setDuplicates(duplicateCheck);
        setShowDuplicateModal(true);
        dispatch({ type: 'SUBMIT_FAIL' });
        isSubmittingRef.current = false;
        isCreatingFacility = false;
        return;
      }

      await createFacility();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create ground');
      dispatch({ type: 'SUBMIT_FAIL' });
      isSubmittingRef.current = false;
      isCreatingFacility = false;
    }
  }, [
    state,
    createFacility,
    dispatch,
    basicAllowed,
    proAllowed,
    userFacilityCount,
  ]);

  const handleContinueAnyway = async () => {
    setShowDuplicateModal(false);
    try {
      dispatch({ type: 'SUBMIT_START' });
      isSubmittingRef.current = true;
      isCreatingFacility = true;
      await createFacility();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create ground');
      dispatch({ type: 'SUBMIT_FAIL' });
      isSubmittingRef.current = false;
      isCreatingFacility = false;
    }
  };

  // ── Success screen ──

  if (state.showSuccess) {
    const emoji =
      state.sportTypes.length > 0
        ? getSportEmoji(state.sportTypes[0] as string)
        : '🏟️';

    return (
      <WizardSuccessScreen
        emoji={emoji}
        title={`${state.name} is live!`}
        summaryRows={[
          { label: 'Address', value: `${state.city}, ${state.state}` },
          {
            label: 'Sports',
            value: state.sportTypes.map(s => getSportEmoji(s)).join('  '),
          },
          {
            label: 'Courts',
            value:
              state.courts.length === 0 ? 'None' : `${state.courts.length}`,
          },
        ]}
        actions={[
          {
            label: 'Go to facility',
            icon: 'arrow-forward',
            onPress: () => {
              if (state.createdFacilityId) {
                (navigation as any).navigate('FacilityDetails', {
                  facilityId: state.createdFacilityId,
                });
              } else {
                (navigation as any).navigate('Facilities', {
                  screen: 'FacilitiesList',
                  params: { refresh: Date.now() },
                });
              }
            },
            variant: 'primary' as const,
          },
          {
            label: 'Back to grounds',
            icon: 'grid-outline',
            onPress: () => {
              (navigation as any).navigate('Facilities', {
                screen: 'FacilitiesList',
                params: { refresh: Date.now() },
              });
            },
            variant: 'secondary' as const,
          },
        ]}
      />
    );
  }

  // ── Main render ──

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.bgScreen }}>
        <FacilityFlowContainer onSubmit={handleSubmit}>
          <Step1NameSports />
          <Step2Location />
          <Step3Contact />
          <Step4Courts />
          <Step5Policies />
        </FacilityFlowContainer>
      </View>

      {/* Duplicate Warning Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.duplicateModalContent,
              { backgroundColor: colors.white },
            ]}
          >
            <View style={styles.duplicateModalHeader}>
              <Ionicons name="warning" size={32} color={colors.gold} />
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                Grounds Already Exist
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: colors.inkSoft }]}>
              We found {duplicates.length} existing{' '}
              {duplicates.length === 1 ? 'ground' : 'grounds'} at this address:
            </Text>

            <ScrollView style={styles.duplicateList}>
              {duplicates.map(facility => (
                <View
                  key={facility.id}
                  style={[
                    styles.duplicateCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.duplicateName, { color: colors.ink }]}>
                    {facility.name}
                  </Text>
                  <Text
                    style={[styles.duplicateAddress, { color: colors.inkSoft }]}
                  >
                    {facility.street}, {facility.city}, {facility.state}{' '}
                    {facility.zipCode}
                  </Text>
                  <View style={styles.sportTypeRow}>
                    {facility.sportTypes.map(sport => (
                      <View
                        key={sport}
                        style={[
                          styles.sportBadge,
                          { backgroundColor: colors.cobalt },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sportBadgeText,
                            { color: colors.white },
                          ]}
                        >
                          {sport}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Text style={[styles.modalQuestion, { color: colors.ink }]}>
              Are you sure you want to create another ground at this location?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: colors.surface },
                ]}
                onPress={() => setShowDuplicateModal(false)}
              >
                <Text
                  style={[styles.cancelButtonText, { color: colors.inkSoft }]}
                >
                  Go Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.continueButton,
                  { backgroundColor: colors.cobalt },
                ]}
                onPress={handleContinueAnyway}
              >
                <Text
                  style={[styles.continueButtonText, { color: colors.white }]}
                >
                  Create Anyway
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <UpsellModal
        visible={showUpsell}
        requiredPlan={upsellPlan}
        onClose={() => setShowUpsell(false)}
        onUpgrade={() => {
          setShowUpsell(false);
        }}
      />
    </>
  );
}

// ── Public export ──

export function CreateFacilityScreen() {
  return (
    <CreateFacilityProvider>
      <CreateFacilityInner />
    </CreateFacilityProvider>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  duplicateModalContent: {
    borderRadius: 12,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  duplicateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  modalDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  duplicateList: { maxHeight: 200, marginBottom: Spacing.lg },
  duplicateCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  duplicateName: {
    fontFamily: fonts.label,
    fontSize: 15,
    marginBottom: 4,
  },
  duplicateAddress: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  sportTypeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  sportBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  sportBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
  modalQuestion: {
    fontFamily: fonts.ui,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: { flexDirection: 'row' },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {},
  cancelButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  continueButton: {},
  continueButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});
