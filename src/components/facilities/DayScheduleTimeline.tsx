import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';

export interface ScheduleSlot {
  time: string; // "HH:MM"
  status: 'available' | 'blocked' | 'rented' | 'own_rental';
  slotId?: string;
  label?: string;
}

interface DayScheduleTimelineProps {
  slots: ScheduleSlot[];
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectStart: (time: string) => void;
  onSelectEnd: (time: string) => void;
  minimumMinutes?: number;
  incrementMinutes?: number;
}

const HOUR_HEIGHT = 60;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const h12 = (h || 0) % 12 || 12;
  const ampm = (h || 0) >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export function DayScheduleTimeline({
  slots,
  selectedStart,
  selectedEnd,
  onSelectStart,
  onSelectEnd,
  minimumMinutes = 60,
  incrementMinutes = 30,
}: DayScheduleTimelineProps) {
  const handleSlotTap = useCallback(
    (slot: ScheduleSlot) => {
      if (slot.status === 'blocked' || slot.status === 'rented') return;

      const tapMin = timeToMinutes(slot.time);

      if (
        selectedStart === null ||
        (selectedStart !== null && selectedEnd !== null)
      ) {
        onSelectStart(slot.time);
        onSelectEnd(minutesToTime(tapMin + incrementMinutes));
      } else {
        const endTime = minutesToTime(tapMin + incrementMinutes);
        if (tapMin >= timeToMinutes(selectedStart)) {
          const startMin = timeToMinutes(selectedStart);
          const blocked = slots.some(s => {
            const sMin = timeToMinutes(s.time);
            return (
              sMin >= startMin &&
              sMin <= tapMin &&
              (s.status === 'blocked' || s.status === 'rented')
            );
          });
          if (blocked) {
            onSelectStart(slot.time);
            onSelectEnd(minutesToTime(tapMin + incrementMinutes));
          } else {
            onSelectEnd(endTime);
          }
        } else {
          onSelectStart(slot.time);
          onSelectEnd(minutesToTime(tapMin + incrementMinutes));
        }
      }
    },
    [
      selectedStart,
      selectedEnd,
      onSelectStart,
      onSelectEnd,
      slots,
      incrementMinutes,
    ]
  );

  if (slots.length === 0) return null;

  const firstMin = timeToMinutes(slots[0]!.time);
  const lastSlot = slots[slots.length - 1]!;
  const lastMin = timeToMinutes(lastSlot.time) + incrementMinutes;
  const totalMinutes = lastMin - firstMin;
  const totalHeight = (totalMinutes / 60) * HOUR_HEIGHT;

  const selStartMin = selectedStart ? timeToMinutes(selectedStart) : null;
  const selEndMin = selectedEnd ? timeToMinutes(selectedEnd) : null;

  // Duration display
  const duration =
    selStartMin !== null && selEndMin !== null && selEndMin > selStartMin
      ? selEndMin - selStartMin
      : 0;
  const durationLabel =
    duration > 0
      ? duration >= 60
        ? `${Math.floor(duration / 60)}${duration % 60 > 0 ? `.${duration % 60}` : ''} hour${Math.floor(duration / 60) !== 1 ? 's' : ''}`
        : `${duration} min`
      : '';
  const tooShort = duration > 0 && duration < minimumMinutes;

  // Build hour labels
  const firstHour = Math.floor(firstMin / 60);
  const lastHour = Math.ceil(lastMin / 60);
  const hourLabels: number[] = [];
  for (let h = firstHour; h <= lastHour; h++) hourLabels.push(h);

  return (
    <View>
      <ScrollView style={styles.scrollContainer} nestedScrollEnabled>
        <View style={[styles.timeline, { height: totalHeight }]}>
          {/* Hour lines */}
          {hourLabels.map(h => {
            const top = ((h * 60 - firstMin) / 60) * HOUR_HEIGHT;
            const h12 = h % 12 || 12;
            const ampm = h >= 12 ? 'PM' : 'AM';
            return (
              <View key={h} style={[styles.hourLine, { top }]}>
                <Text style={styles.hourLabel}>
                  {h12} {ampm}
                </Text>
                <View style={styles.hourDivider} />
              </View>
            );
          })}

          {/* Slot blocks */}
          {slots.map(slot => {
            const slotMin = timeToMinutes(slot.time);
            const top = ((slotMin - firstMin) / 60) * HOUR_HEIGHT;
            const height = (incrementMinutes / 60) * HOUR_HEIGHT;

            const isInSelection =
              selStartMin !== null &&
              selEndMin !== null &&
              slotMin >= selStartMin &&
              slotMin < selEndMin;

            let bg: string = colors.pineTint; // available
            let textColor: string = colors.pine;
            let label = '';

            if (slot.status === 'blocked' || slot.status === 'rented') {
              bg = tokenColors.border;
              textColor = colors.inkFaint;
              label = 'Booked';
            } else if (slot.status === 'own_rental') {
              bg = tokenColors.cobaltLight;
              textColor = colors.sportHockey;
              label = 'Your Reservation';
            }

            if (
              isInSelection &&
              slot.status !== 'blocked' &&
              slot.status !== 'rented'
            ) {
              bg = colors.pine;
              textColor = colors.white;
            }

            return (
              <TouchableOpacity
                key={slot.time}
                style={[styles.slotBlock, { top, height, backgroundColor: bg }]}
                onPress={() => handleSlotTap(slot)}
                activeOpacity={
                  slot.status === 'blocked' || slot.status === 'rented'
                    ? 1
                    : 0.7
                }
                disabled={slot.status === 'blocked' || slot.status === 'rented'}
              >
                <Text style={[styles.slotTime, { color: textColor }]}>
                  {fmt12(slot.time)}
                </Text>
                {label ? (
                  <Text style={[styles.slotLabel, { color: textColor }]}>
                    {label}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Duration display */}
      {duration > 0 && (
        <View
          style={[styles.durationRow, tooShort && styles.durationRowWarning]}
        >
          <Text
            style={[
              styles.durationText,
              tooShort && styles.durationTextWarning,
            ]}
          >
            {fmt12(selectedStart!)} – {fmt12(selectedEnd!)} · {durationLabel}
          </Text>
          {tooShort && (
            <Text style={styles.warningText}>
              Minimum booking is {minimumMinutes} min
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { maxHeight: 400 },
  timeline: { marginLeft: 56, marginRight: 8, position: 'relative' },
  hourLine: {
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
    color: colors.inkSoft,
    textAlign: 'right',
    marginRight: 8,
  },
  hourDivider: { flex: 1, height: 1, backgroundColor: colors.border },
  slotBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  slotTime: { fontFamily: fonts.label, fontSize: 12 },
  slotLabel: { fontFamily: fonts.body, fontSize: 11, marginTop: 1 },
  durationRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.pineTint,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  durationRowWarning: { backgroundColor: colors.heartTint },
  durationText: { fontFamily: fonts.label, fontSize: 14, color: colors.pine },
  durationTextWarning: { color: colors.heart },
  warningText: { fontFamily: fonts.body, fontSize: 12, color: colors.heart },
});
