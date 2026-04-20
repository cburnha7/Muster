import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import {
  useApproveReservationMutation,
  useDenyReservationMutation,
} from '../../store/api/insuranceDocumentsApi';
import { HomeStackParamList } from '../../navigation/types';
import { API_BASE_URL } from '../../services/api/config';

type ScreenRouteProp = RouteProp<
  HomeStackParamList,
  'PendingReservationDetails'
>;

function formatTime(time: string): string {
  const parts = time.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m === 0
    ? `${hour12}:00 ${period}`
    : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(dateStr: string): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const parts = dateStr.split('-').map(Number);
  return `${months[(parts[1] ?? 1) - 1]} ${parts[2]}, ${parts[0]}`;
}

export function PendingReservationDetailsScreen() {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<ScreenRouteProp>();
  const { rentalId } = route.params ?? {};

  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approveReservation, { isLoading: isApproving }] =
    useApproveReservationMutation();
  const [denyReservation, { isLoading: isDenying }] =
    useDenyReservationMutation();
  const isBusy = isApproving || isDenying;

  const loadRental = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/rentals/${rentalId}`);
      if (!response.ok) throw new Error('Failed to load reservation');
      const data = await response.json();
      setRental(data);
    } catch {
      Alert.alert('Error', 'Failed to load reservation details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    loadRental();
  }, [loadRental]);

  const handleApprove = useCallback(() => {
    Alert.alert(
      'Approve Reservation',
      'Are you sure you want to approve this reservation?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveReservation({ rentalId }).unwrap();
              Alert.alert('Approved', 'The reservation has been confirmed.');
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to approve reservation.');
            }
          },
        },
      ]
    );
  }, [rentalId, approveReservation, navigation]);

  const handleDeny = useCallback(() => {
    Alert.alert(
      'Deny Reservation',
      'Are you sure you want to deny this reservation?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              await denyReservation({ rentalId }).unwrap();
              Alert.alert(
                'Denied',
                'The reservation has been denied and the time slot released.'
              );
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to deny reservation.');
            }
          },
        },
      ]
    );
  }, [rentalId, denyReservation, navigation]);

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: themeColors.bgScreen }]}
      >
        <ActivityIndicator size="large" color={colors.cobalt} />
      </View>
    );
  }

  if (!rental) return null;

  const timeSlot = rental.timeSlot;
  const court = timeSlot?.court;
  const facility = court?.facility;
  const renter = rental.user;
  const insuranceDoc = rental.attachedInsuranceDocument;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bgScreen }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservation Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              rental.status === 'pending_approval'
                ? styles.pendingBadge
                : styles.confirmedBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {rental.status === 'pending_approval'
                ? 'Pending Approval'
                : rental.status}
            </Text>
          </View>
        </View>

        {/* Renter info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Renter</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={colors.inkFaint} />
            <Text style={styles.infoText}>
              {renter ? `${renter.firstName} ${renter.lastName}` : 'Unknown'}
            </Text>
          </View>
          {renter?.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
              <Text style={styles.infoText}>{renter.email}</Text>
            </View>
          )}
        </View>

        {/* Ground & Court */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ground</Text>
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={colors.inkFaint}
            />
            <Text style={styles.infoText}>{facility?.name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="grid-outline" size={18} color={colors.inkFaint} />
            <Text style={styles.infoText}>{court?.name || 'Court'}</Text>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date & Time</Text>
          {timeSlot?.date && (
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.inkFaint}
              />
              <Text style={styles.infoText}>{formatDate(timeSlot.date)}</Text>
            </View>
          )}
          {timeSlot?.startTime && timeSlot?.endTime && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.inkFaint} />
              <Text style={styles.infoText}>
                {formatTime(timeSlot.startTime)} –{' '}
                {formatTime(timeSlot.endTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Price</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color={colors.inkFaint} />
            <Text style={styles.infoText}>
              ${rental.totalPrice?.toFixed(2) ?? '0.00'}
            </Text>
          </View>
        </View>

        {/* Insurance Document */}
        {insuranceDoc && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Proof of Insurance</Text>
            <TouchableOpacity
              style={styles.documentCard}
              onPress={() => {
                if (insuranceDoc.documentUrl) {
                  Linking.openURL(insuranceDoc.documentUrl).catch(() =>
                    Alert.alert(
                      'Error',
                      'Unable to open the insurance document.'
                    )
                  );
                }
              }}
              accessibilityRole="link"
              accessibilityLabel={`View insurance document: ${insuranceDoc.policyName || 'Insurance'}`}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color={colors.cobalt}
              />
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={1}>
                  {insuranceDoc.policyName || 'Insurance Document'}
                </Text>
                {insuranceDoc.providerName && (
                  <Text style={styles.documentProvider}>
                    {insuranceDoc.providerName}
                  </Text>
                )}
              </View>
              <Ionicons name="open-outline" size={18} color={colors.inkFaint} />
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons — only for pending */}
        {rental.status === 'pending_approval' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveBtn]}
              onPress={handleApprove}
              disabled={isBusy}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color={tokenColors.white} />
              ) : (
                <Text style={styles.actionBtnText}>Approve</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.denyBtn]}
              onPress={handleDeny}
              disabled={isBusy}
            >
              {isDenying ? (
                <ActivityIndicator size="small" color={tokenColors.white} />
              ) : (
                <Text style={styles.actionBtnText}>Deny</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  statusRow: { alignItems: 'flex-start', marginBottom: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pendingBadge: { backgroundColor: tokenColors.warningLight },
  confirmedBadge: { backgroundColor: tokenColors.successLight },
  statusText: { fontFamily: fonts.label, fontSize: 13, color: colors.ink },
  section: {
    backgroundColor: tokenColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  documentInfo: { flex: 1 },
  documentName: { fontFamily: fonts.label, fontSize: 14, color: colors.cobalt },
  documentProvider: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: { backgroundColor: colors.cobalt },
  denyBtn: { backgroundColor: colors.heart },
  actionBtnText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: tokenColors.white,
  },
});
