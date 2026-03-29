import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import {
  useGetPendingReservationsQuery,
  useApproveReservationMutation,
  useDenyReservationMutation,
} from '../../store/api/insuranceDocumentsApi';

export interface PendingReservationsSectionProps {
  ownerId: string;
}

/**
 * Formats a date string and time range for display.
 * e.g. "Jan 20, 2024 • 2:00 PM – 3:00 PM"
 */
function formatDateTime(dateStr: string, startTime: string, endTime: string): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1] ?? 1;
  const day = parts[2];
  const monthName = months[month - 1] || '';
  const datePart = `${monthName} ${day}, ${year}`;

  const formatTime = (time: string): string => {
    const timeParts = time.split(':').map(Number);
    const h = timeParts[0] ?? 0;
    const m = timeParts[1] ?? 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return `${datePart} • ${formatTime(startTime)} – ${formatTime(endTime)}`;
}

export function PendingReservationsSection({ ownerId }: PendingReservationsSectionProps) {
  const navigation = useNavigation<any>();
  const { data: reservations = [], isLoading } = useGetPendingReservationsQuery({ ownerId });
  const [approveReservation, { isLoading: isApproving }] = useApproveReservationMutation();
  const [denyReservation, { isLoading: isDenying }] = useDenyReservationMutation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isBusy = isApproving || isDenying;

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleApprove = useCallback(
    (rentalId: string) => {
      Alert.alert('Approve Reservation', 'Are you sure you want to approve this reservation?', [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveReservation({ rentalId }).unwrap();
              Alert.alert('Approved', 'The reservation has been confirmed.');
            } catch {
              Alert.alert('Error', 'Failed to approve reservation. Please try again.');
            }
          },
        },
      ]);
    },
    [approveReservation],
  );

  const handleDeny = useCallback(
    (rentalId: string) => {
      Alert.alert('Deny Reservation', 'Are you sure you want to deny this reservation?', [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              await denyReservation({ rentalId }).unwrap();
              Alert.alert('Denied', 'The reservation has been denied and the time slot released.');
            } catch {
              Alert.alert('Error', 'Failed to deny reservation. Please try again.');
            }
          },
        },
      ]);
    },
    [denyReservation],
  );

  const handleViewDocument = useCallback((documentUrl: string) => {
    Linking.openURL(documentUrl).catch(() => {
      Alert.alert('Error', 'Unable to open the insurance document.');
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Reservations</Text>
        <ActivityIndicator size="small" color={colors.cobalt} style={styles.loader} />
      </View>
    );
  }

  if (!reservations || reservations.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pending Reservations</Text>
      {reservations.map((reservation: any) => {
        const isExpanded = expandedId === reservation.id;
        const timeSlot = reservation.timeSlot;
        const renterName = (reservation.user || reservation.renter)
          ? `${(reservation.user || reservation.renter).firstName} ${(reservation.user || reservation.renter).lastName}`
          : 'Unknown';
        const courtName = timeSlot?.court?.name || 'Court';
        const facilityName = timeSlot?.court?.facility?.name || '';
        const dateTime =
          timeSlot?.date && timeSlot?.startTime && timeSlot?.endTime
            ? formatDateTime(timeSlot.date, timeSlot.startTime, timeSlot.endTime)
            : '';
        const documentUrl = reservation.attachedInsuranceDocument?.documentUrl;
        const policyName = reservation.attachedInsuranceDocument?.policyName;

        return (
          <TouchableOpacity
            key={reservation.id}
            style={styles.card}
            onPress={() => navigation.navigate('PendingReservationDetails', { rentalId: reservation.id })}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Pending reservation from ${renterName}`}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.renterName}>{renterName}</Text>
                <Text style={styles.courtText}>
                  {courtName}{facilityName ? ` — ${facilityName}` : ''}
                </Text>
                {dateTime ? <Text style={styles.dateTimeText}>{dateTime}</Text> : null}
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.inkFaint}
              />
            </View>

            {isExpanded && (
              <View style={styles.expandedContent}>
                {documentUrl && (
                  <TouchableOpacity
                    style={styles.documentRow}
                    onPress={() => handleViewDocument(documentUrl)}
                    accessibilityRole="link"
                    accessibilityLabel={`View insurance document: ${policyName || 'Insurance'}`}
                  >
                    <Ionicons name="document-text-outline" size={18} color={colors.cobalt} />
                    <Text style={styles.documentText} numberOfLines={1}>
                      {policyName || 'Insurance Document'}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={colors.inkFaint} />
                  </TouchableOpacity>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.approveButton]}
                    onPress={() => handleApprove(reservation.id)}
                    disabled={isBusy}
                    accessibilityLabel={`Approve reservation for ${renterName}`}
                    accessibilityRole="button"
                  >
                    {isApproving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Approve</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.denyButton]}
                    onPress={() => handleDeny(reservation.id)}
                    disabled={isBusy}
                    accessibilityLabel={`Deny reservation for ${renterName}`}
                    accessibilityRole="button"
                  >
                    {isDenying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Deny</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 12,
  },
  loader: {
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  renterName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  courtText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 2,
  },
  dateTimeText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white,
    paddingTop: Spacing.md,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  documentText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cobalt,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: colors.cobalt,
  },
  denyButton: {
    backgroundColor: colors.heart,
  },
  buttonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
