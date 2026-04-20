import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { fonts, Spacing, Shadows, useTheme } from '../../theme';

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
  endTime: string
): string {
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

  // Parse the date (expected format: "YYYY-MM-DD")
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = months[month - 1] || '';
  const datePart = `${monthName} ${day}, ${year}`;

  const formatTime = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return m === 0
      ? `${hour12}:00 ${period}`
      : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return `${datePart} • ${formatTime(startTime)} – ${formatTime(endTime)}`;
}

export const CancelRequestCard: React.FC<CancelRequestCardProps> = ({
  cancelRequest,
  onApprove,
  onDeny,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const { user, reservation } = cancelRequest;
  const { timeSlot } = reservation;
  const userName = `${user.firstName} ${user.lastName}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.userName, { color: colors.ink }]}>{userName}</Text>

      <Text style={[styles.courtName, { color: colors.inkFaint }]}>
        {timeSlot.court.name} — {timeSlot.court.facility.name}
      </Text>

      <Text style={[styles.dateTime, { color: colors.ink }]}>
        {formatBookingDateTime(
          timeSlot.date,
          timeSlot.startTime,
          timeSlot.endTime
        )}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.approveButton, { backgroundColor: colors.cobalt }]}
          onPress={() => onApprove(cancelRequest.id)}
          disabled={isLoading}
          accessibilityLabel={`Approve cancellation for ${userName}`}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.white }]}>Approve</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.denyButton, { backgroundColor: colors.heart }]}
          onPress={() => onDeny(cancelRequest.id)}
          disabled={isLoading}
          accessibilityLabel={`Deny cancellation for ${userName}`}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.white }]}>Deny</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  userName: {
    fontFamily: fonts.label,
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  courtName: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  dateTime: {
    fontFamily: fonts.body,
    fontSize: 14,
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
  approveButton: {},
  denyButton: {},
  buttonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});
