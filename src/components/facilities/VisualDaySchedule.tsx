import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';

export interface ScheduleBlock {
  startTime: string; // HH:MM
  endTime: string;
  status: 'available' | 'booked' | 'own_reservation';
  price: number;
}

interface VisualDayScheduleProps {
  schedule: ScheduleBlock[];
  proposedStart: string | null; // HH:MM
  proposedEnd: string | null;
  slotIncrementMinutes: number;
}

const HOUR_HEIGHT = 36;

function toMin(t: string): number {
  const p = t.split(':').map(Number);
  return (p[0] || 0) * 60 + (p[1] || 0);
}

function fmt12(t: string): string {
  const p = t.split(':').map(Number);
  const h = p[0] || 0;
  const m = p[1] || 0;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function VisualDaySchedule({
  schedule,
  proposedStart,
  proposedEnd,
  slotIncrementMinutes,
}: VisualDayScheduleProps) {
  const { colors } = useTheme();
  if (schedule.length === 0) return null;

  const firstMin = toMin(schedule[0]!.startTime);
  const lastBlock = schedule[schedule.length - 1]!;
  const lastMin = toMin(lastBlock.endTime);
  const totalMinutes = lastMin - firstMin;
  const totalHeight = (totalMinutes / 60) * HOUR_HEIGHT;

  const propStartMin = proposedStart ? toMin(proposedStart) : null;
  const propEndMin = proposedEnd ? toMin(proposedEnd) : null;

  // Hour labels
  const firstHour = Math.floor(firstMin / 60);
  const lastHour = Math.ceil(lastMin / 60);

  return (
    <View style={styles.container}>
      <View style={[styles.timeline, { height: totalHeight + 20 }]}>
        {/* Hour lines + labels */}
        {Array.from(
          { length: lastHour - firstHour + 1 },
          (_, i) => firstHour + i
        ).map(h => {
          const top = ((h * 60 - firstMin) / 60) * HOUR_HEIGHT;
          const h12 = h % 12 || 12;
          const ampm = h >= 12 ? 'PM' : 'AM';
          return (
            <View key={h} style={[styles.hourRow, { top }]}>
              <Text style={[styles.hourLabel, { color: colors.inkSoft }]}>
                {h12} {ampm}
              </Text>
              <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
            </View>
          );
        })}

        {/* Booked blocks */}
        {schedule
          .filter(b => b.status === 'booked')
          .map((block, i) => {
            const top =
              ((toMin(block.startTime) - firstMin) / 60) * HOUR_HEIGHT;
            const height =
              ((toMin(block.endTime) - toMin(block.startTime)) / 60) *
              HOUR_HEIGHT;
            return (
              <View
                key={`booked-${i}`}
                style={[styles.bookedBlock, { backgroundColor: colors.border }, { top, height }]}
              >
                <Text style={[styles.bookedLabel, { color: colors.inkFaint }]}>Booked</Text>
              </View>
            );
          })}

        {/* Own reservation blocks */}
        {schedule
          .filter(b => b.status === 'own_reservation')
          .map((block, i) => {
            const top =
              ((toMin(block.startTime) - firstMin) / 60) * HOUR_HEIGHT;
            const height =
              ((toMin(block.endTime) - toMin(block.startTime)) / 60) *
              HOUR_HEIGHT;
            return (
              <View key={`own-${i}`} style={[styles.ownBlock, { backgroundColor: colors.cobaltLight, borderColor: colors.sportHockey }, { top, height }]}>
                <Text style={[styles.ownLabel, { color: colors.sportHockey }]}>Your Reservation</Text>
              </View>
            );
          })}

        {/* Proposed booking overlay */}
        {propStartMin !== null &&
          propEndMin !== null &&
          propEndMin > propStartMin && (
            <View
              style={[
                styles.proposedBlock, { backgroundColor: colors.pine + '30', borderColor: colors.pine },
                {
                  top: ((propStartMin - firstMin) / 60) * HOUR_HEIGHT,
                  height: ((propEndMin - propStartMin) / 60) * HOUR_HEIGHT,
                }]}
            >
              <Text style={[styles.proposedLabel, { color: colors.pine }]}>
                {fmt12(proposedStart!)} Ã¢â‚¬â€œ {fmt12(proposedEnd!)}
              </Text>
            </View>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  timeline: { marginLeft: 56, marginRight: 12, position: 'relative' },
  hourRow: {
    position: 'absolute',
    left: -56,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    width: 48,
    fontFamily: fonts.label,
    fontSize: 11,
    textAlign: 'right',
    paddingRight: 6,
  },
  hourLine: { flex: 1, height: 1 },
  bookedBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  bookedLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
  },
  ownBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    justifyContent: 'center',
    paddingLeft: 12,
    borderWidth: 1,
  },
  ownLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
  },
  proposedBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    justifyContent: 'center',
    paddingLeft: 12,
    borderWidth: 2,
  },
  proposedLabel: { fontFamily: fonts.label, fontSize: 13 },
});
