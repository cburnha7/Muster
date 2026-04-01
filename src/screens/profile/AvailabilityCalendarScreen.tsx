import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import CrossPlatformDateTimePicker from '../../components/ui/CrossPlatformDateTimePicker';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { colors, fonts } from '../../theme';

// ── Types ───────────────────────────────────────────

type Frequency = 'once' | 'weekly' | 'biweekly' | 'monthly';

interface AvailabilityBlock {
  id: string;
  date: string;
  name: string;
  startTime: string;
  endTime: string;
  frequency: Frequency;
}

const FREQUENCY_OPTIONS: SelectOption[] = [
  { label: 'Once', value: 'once' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function timeToString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ── Component ───────────────────────────────────────

export function AvailabilityCalendarScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = (route.params as { userId: string }) || {};
  // userId will be used for server persistence in a future update
  void userId;

  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Add-block modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [frequency, setFrequency] = useState<Frequency>('once');

  // Import file modal state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Handlers ────────────────────────────────────

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const openAddModal = useCallback(() => {
    if (!selectedDate) {
      Alert.alert('Select a Date', 'Tap a day on the calendar first.');
      return;
    }
    setBlockName('');
    const now = new Date();
    now.setMinutes(0, 0, 0);
    setStartTime(new Date(now));
    const later = new Date(now);
    later.setHours(later.getHours() + 1);
    setEndTime(later);
    setFrequency('once');
    setAddModalVisible(true);
  }, [selectedDate]);

  const handleSaveBlock = useCallback(() => {
    if (!blockName.trim()) {
      Alert.alert('Name Required', 'Please enter an event name.');
      return;
    }
    const newBlock: AvailabilityBlock = {
      id: generateId(),
      date: selectedDate,
      name: blockName.trim(),
      startTime: timeToString(startTime),
      endTime: timeToString(endTime),
      frequency,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setAddModalVisible(false);
  }, [blockName, selectedDate, startTime, endTime, frequency]);

  const handleDeleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleFilePick = useCallback(() => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      Alert.alert('File Import', 'File picking is only supported on web for now.');
    }
  }, []);

  const handleFileSelected = useCallback((event: any) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setImportedFileName(file.name);
      setBatchName('');
      setImportModalVisible(true);
    }
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!batchName.trim()) {
      Alert.alert('Batch Name Required', 'Please enter a batch name.');
      return;
    }
    // Stub: in the future, parse the file and create blocks server-side
    Alert.alert('Imported', `Batch "${batchName}" with file "${importedFileName}" queued for processing.`);
    setImportModalVisible(false);
    setImportedFileName('');
    setBatchName('');
  }, [batchName, importedFileName]);

  const handleImportCalendar = useCallback(() => {
    Alert.alert('Coming Soon', 'Calendar import will be available in a future update.');
  }, []);

  // ── Derived data ────────────────────────────────

  const markedDates = blocks.reduce<Record<string, any>>((acc, block) => {
    acc[block.date] = {
      ...(acc[block.date] || {}),
      marked: true,
      dotColor: colors.pine,
    };
    return acc;
  }, {} as Record<string, any>);

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: colors.cobalt,
    };
  }

  const blocksForDay = blocks.filter((b) => b.date === selectedDate);

  // ── Render ──────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Import Section */}
        <View style={styles.importSection}>
          <Text style={styles.importLabel}>Import Calendar</Text>
          <View style={styles.importRow}>
            <TouchableOpacity style={styles.importBtn} onPress={handleFilePick} activeOpacity={0.7}>
              <Ionicons name="document-outline" size={18} color={colors.cobalt} />
              <Text style={styles.importBtnText}>Drop a File</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.importBtn} onPress={handleImportCalendar} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={18} color={colors.cobalt} />
              <Text style={styles.importBtnText}>Import from Calendar</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef as any}
              type="file"
              accept=".csv,.xlsx,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
          )}
        </View>

        {/* Calendar */}
        <Calendar
          onDayPress={handleDayPress}
          markedDates={markedDates}
          theme={{
            todayTextColor: colors.cobalt,
            selectedDayBackgroundColor: colors.cobalt,
            selectedDayTextColor: colors.white,
            dotColor: colors.pine,
            arrowColor: colors.cobalt,
            monthTextColor: colors.ink,
            textMonthFontFamily: fonts.heading,
            textDayFontFamily: fonts.body,
            textDayHeaderFontFamily: fonts.label,
          }}
          style={styles.calendar}
        />

        {/* Add block button */}
        <TouchableOpacity style={styles.addBlockBtn} onPress={openAddModal} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={20} color={colors.white} />
          <Text style={styles.addBlockBtnText}>Block Off Time</Text>
        </TouchableOpacity>

        {/* Blocks for selected day */}
        {selectedDate ? (
          <View style={styles.daySection}>
            <Text style={styles.daySectionTitle}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {blocksForDay.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={24} color={colors.outline} />
                <Text style={styles.emptyCardText}>No availability blocks</Text>
              </View>
            ) : (
              blocksForDay.map((block) => (
                <View key={block.id} style={styles.blockCard}>
                  <View style={styles.blockInfo}>
                    <Text style={styles.blockName}>{block.name}</Text>
                    <Text style={styles.blockTime}>
                      {block.startTime} – {block.endTime}
                    </Text>
                    <Text style={styles.blockFreq}>
                      {FREQUENCY_OPTIONS.find((o) => o.value === block.frequency)?.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteBlock(block.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${block.name}`}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.heart} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.daySection}>
            <Text style={styles.emptyCardText}>Tap a day to view or add blocks</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Add Block Modal ──────────────────── */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Availability Block</Text>
            <Text style={styles.modalDate}>{selectedDate}</Text>

            <Text style={styles.fieldLabel}>Event Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Practice, Open Gym"
              placeholderTextColor={colors.inkSoft}
              value={blockName}
              onChangeText={setBlockName}
            />

            <Text style={styles.fieldLabel}>Start Time</Text>
            <CrossPlatformDateTimePicker
              value={startTime}
              mode="time"
              onChange={(_e: any, d?: Date) => d && setStartTime(d)}
              minuteInterval={15}
            />

            <Text style={styles.fieldLabel}>End Time</Text>
            <CrossPlatformDateTimePicker
              value={endTime}
              mode="time"
              onChange={(_e: any, d?: Date) => d && setEndTime(d)}
              minuteInterval={15}
            />

            <FormSelect
              label="Frequency"
              value={frequency}
              options={FREQUENCY_OPTIONS}
              onValueChange={(v) => setFrequency(v as Frequency)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveBlock} activeOpacity={0.7}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Import File Modal ────────────────── */}
      <Modal visible={importModalVisible} transparent animationType="slide" onRequestClose={() => setImportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Import File</Text>

            <Text style={styles.fieldLabel}>Batch Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Spring Schedule"
              placeholderTextColor={colors.inkSoft}
              value={batchName}
              onChangeText={setBatchName}
            />

            <View style={styles.fileRow}>
              <Ionicons name="document-attach-outline" size={20} color={colors.cobalt} />
              <Text style={styles.fileName} numberOfLines={1}>{importedFileName}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setImportModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmImport} activeOpacity={0.7}>
                <Text style={styles.modalSaveText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 40,
  },

  // ── Import ──────────────────────────────
  importSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  importLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  importRow: {
    flexDirection: 'row',
    gap: 10,
  },
  importBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cobalt,
    backgroundColor: colors.surface,
  },
  importBtnText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.cobalt,
  },

  // ── Calendar ────────────────────────────
  calendar: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  // ── Add block button ────────────────────
  addBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.cobalt,
  },
  addBlockBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.white,
  },

  // ── Day section ─────────────────────────
  daySection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  daySectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyCardText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 6,
    textAlign: 'center',
  },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  blockInfo: {
    flex: 1,
  },
  blockName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
  },
  blockTime: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
  },
  blockFreq: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.cobalt,
    marginTop: 2,
  },

  // ── Modal ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 4,
  },
  modalDate: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.inkSoft,
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.cobalt,
  },
  modalSaveText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.white,
  },

  // ── File import row ─────────────────────
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  fileName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
});
