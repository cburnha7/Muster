import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { facilityService } from '../../services/api/FacilityService';
import { courtService } from '../../services/api/CourtService';
import { addFacility, selectFacilities } from '../../store/slices/facilitiesSlice';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { getSportEmoji } from '../../constants/sports';
import { Facility } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { colors, fonts, Spacing } from '../../theme';

import { CreateFacilityProvider, useCreateFacility } from './create-flow/CreateFacilityContext';
import { FacilityFlowContainer } from './create-flow/FacilityFlowContainer';
import { Step1NameSports } from './create-flow/Step1NameSports';
import { Step2Location } from './create-flow/Step2Location';
import { Step3Contact } from './create-flow/Step3Contact';
import { Step4Courts } from './create-flow/Step4Courts';
import { Step5Policies } from './create-flow/Step5Policies';

// ── Inner component (needs context) ──

let isCreatingFacility = false;

function CreateFacilityInner() {
  const navigation = useNavigation();
  const reduxDispatch = useDispatch();
  const { user } = useAuth();
  const allFacilities = useSelector(selectFacilities);
  const userFacilityCount = allFacilities.filter((f) => f.ownerId === user?.id).length;

  const { allowed: basicAllowed, requiredPlan: basicPlan } = useFeatureGate('facility_basic');
  const { allowed: proAllowed, requiredPlan: proPlan } = useFeatureGate('facility_pro');
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('facility_basic');

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
      latitude: 0,
      longitude: 0,
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
      hoursOfOperation: state.hoursOfOperation.length > 0 ? state.hoursOfOperation : undefined,
      cancellationPolicyHours: state.cancellationPolicyHours,
      requiresInsurance: state.requiresInsurance,
      requiresBookingConfirmation: state.requiresBookingConfirmation,
      waiverRequired: state.waiverRequired,
      waiverText: state.waiverRequired ? state.waiverText : '',
    };

    const newFacility = await facilityService.createFacility(facilityData as any);

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

    reduxDispatch(addFacility({ ...newFacility, courts: createdCourts } as any));
    dispatch({ type: 'SUBMIT_SUCCESS', facilityId: newFacility.id });
    isSubmittingRef.current = false;
    isCreatingFacility = false;
  }, [state, user, reduxDispatch, dispatch]);

  // ── Submit handler ──

  const handleSubmit = useCallback(async () => {
    if (state.isSubmitting || isSubmittingRef.current || isCreatingFacility) return;

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
  }, [state, createFacility, dispatch, basicAllowed, proAllowed, userFacilityCount]);

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
      state.sportTypes.length > 0 ? getSportEmoji(state.sportTypes[0] as string) : '🏟️';

    return (
      <WizardSuccessScreen
        emoji={emoji}
        title={`${state.name} is live!`}
        summaryRows={[
          { label: 'Address', value: `${state.city}, ${state.state}` },
          {
            label: 'Sports',
            value: state.sportTypes.map((s) => getSportEmoji(s)).join('  '),
          },
          {
            label: 'Courts',
            value: state.courts.length === 0 ? 'None' : `${state.courts.length}`,
          },
        ]}
        actions={[
          {
            label: 'Go to facility',
            icon: 'arrow-forward',
            onPress: () => {
              if (state.createdFacilityId) {
                (navigation as any).navigate('FacilityDetail', {
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
      <FacilityFlowContainer onSubmit={handleSubmit}>
        <Step1NameSports />
        <Step2Location />
        <Step3Contact />
        <Step4Courts />
        <Step5Policies />
      </FacilityFlowContainer>

      {/* Duplicate Warning Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateModalContent}>
            <View style={styles.duplicateModalHeader}>
              <Ionicons name="warning" size={32} color={colors.gold} />
              <Text style={styles.modalTitle}>Grounds Already Exist</Text>
            </View>

            <Text style={styles.modalDescription}>
              We found {duplicates.length} existing{' '}
              {duplicates.length === 1 ? 'ground' : 'grounds'} at this address:
            </Text>

            <ScrollView style={styles.duplicateList}>
              {duplicates.map((facility) => (
                <View key={facility.id} style={styles.duplicateCard}>
                  <Text style={styles.duplicateName}>{facility.name}</Text>
                  <Text style={styles.duplicateAddress}>
                    {facility.street}, {facility.city}, {facility.state} {facility.zipCode}
                  </Text>
                  <View style={styles.sportTypeRow}>
                    {facility.sportTypes.map((sport) => (
                      <View key={sport} style={styles.sportBadge}>
                        <Text style={styles.sportBadgeText}>{sport}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.modalQuestion}>
              Are you sure you want to create another ground at this location?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDuplicateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.continueButton]}
                onPress={handleContinueAnyway}
              >
                <Text style={styles.continueButtonText}>Create Anyway</Text>
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
    backgroundColor: colors.white,
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
    color: colors.ink,
  },
  modalDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  duplicateList: { maxHeight: 200, marginBottom: Spacing.lg },
  duplicateCard: {
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duplicateName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 4,
  },
  duplicateAddress: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  sportTypeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  sportBadge: {
    backgroundColor: colors.cobalt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  sportBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.white,
  },
  modalQuestion: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.ink,
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
  cancelButton: { backgroundColor: colors.surface },
  cancelButtonText: { fontFamily: fonts.ui, fontSize: 14, color: colors.inkSoft },
  continueButton: { backgroundColor: colors.cobalt },
  continueButtonText: { fontFamily: fonts.ui, fontSize: 14, color: colors.white },
});
