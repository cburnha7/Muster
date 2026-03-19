import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, Spacing, Shadows } from '../../theme';

export interface CancelRequestData {
  id: string;
  requestedAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
  reservation: {
    totalPrice: number;
    timeSlot: {
      date: string;
      startTime: string;
      endTime: string;
      court: {
        name: string;
        facility: {
          name: string;
        };
      };
    };
  };
}

export interface CancelRequestCardProps {
  cancelRequest: CancelRequestData;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isLoading?: boolean;
}

/**
 * Formats a date string and time range for display.
 * e.g. "Jan 20, 2024 • 2:00 PM – 3:00 PM"
 */
function formatBookingDateTime(
  dateStr: string,
  startTime: string,
  endTime: string,
): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Parse the date (expected format: "YYYY-MM-DD")
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = months[month - 1] || '';
  const datePart = `${monthName} ${day}, ${year}`;

  const formatTime = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return `${datePart} • ${formatTime(startTime)} – ${formatTime(endTime)}`;
}

export const CancelRequestCard: React.FC<CancelRequestCardProps> = ({
  cancelRequest,
  onApprove,
  onDeny,
  isLoading = false,
}) => {
  const { user, reservation } = cancelRequest;
  const { timeSlot } = reservation;
  const userName = `${user.firstName} ${user.lastName}`;

  return (
    <View style={styles.card}>
      <Text style={styles.userName}>{userName}</Text>

      <Text style={styles.courtName}>
        {timeSlot.court.name} — {timeSlot.court.facility.name}
      </Text>

      <Text style={styles.dateTime}>
        {formatBookingDateTime(timeSlot.date, timeSlot.startTime, timeSlot.endTime)}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={() => onApprove(cancelRequest.id)}
          disabled={isLoading}
          accessibilityLabel={`Approve cancellation for ${userName}`}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Approve</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.denyButton]}
          onPress={() => onDeny(cancelRequest.id)}
          disabled={isLoading}
          accessibilityLabel={`Deny cancellation for ${userName}`}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Deny</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  userName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  courtName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginBottom: Spacing.xs,
  },
  dateTime: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginBottom: Spacing.md,
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
    backgroundColor: colors.grass,
  },
  denyButton: {
    backgroundColor: colors.track,
  },
  buttonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
