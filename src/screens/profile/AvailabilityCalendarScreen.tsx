import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { userService } from '../../services/api/UserService';
import { colors, fonts } from '../../theme';

// ── Types ──

interface ImportedEvent {
  id: string;
  date: string;
  startTime: string;
  duration: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  startTime: string;
  duration: string;
  source: 'imported' | 'muster';
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Simple CSV/text parser — extracts lines that look like date, time, duration
function parseFileContent(text: string): ImportedEvent[] {
  const events: ImportedEvent[] = [];
  const lines = text.split('\n').filter((l) => l.trim());
  // Skip header row if it looks like one
  const start = lines[0]?.match(/date|time|event|name/i) ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i]!.split(/[,\t]+/).map((p) => p.trim());
    if (parts.length >= 2) {
      // Try to find a date-like value
      const datePart = parts.find((p) => /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(p));
      const timePart = parts.find((p) => /\d{1,2}:\d{2}/.test(p));
      const durationPart = parts.find((p) => /\d+\s*(min|hr|hour|m|h)/i.test(p)) || '60 min';
      if (datePart) {
        // Normalize date to YYYY-MM-DD
        let normalized = datePart;
        const mdyMatch = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
        if (mdyMatch) {
          const yr = mdyMatch[3]!.length === 2 ? `20${mdyMatch[3]}` : mdyMatch[3];
          normalized = `${yr}-${mdyMatch[1]!.padStart(2, '0')}-${mdyMatch[2]!.padStart(2, '0')}`;
        }
        events.push({
          id: generateId(),
          date: normalized,
          startTime: timePart || '12:00',
          duration: durationPart,
        });
      }
    }
  }
  return events;
}

// ── Component ──

export function AvailabilityCalendarScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = (route.params as { userId: string }) || {};
  const currentUser = useSelector(selectUser);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [parsedEvents, setParsedEvents] = useState<ImportedEvent[]>([]);
  const [importedFileName, setImportedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Muster events for this user
  useEffect(() => {
    const targetId = userId || currentUser?.id;
    if (!targetId) return;
    userService.getUserBookings('upcoming', { page: 1, limit: 100 })
      .then((res: any) => {
        const bookings = res?.data || [];
        const musterEvents: CalendarEvent[] = bookings
          .filter((b: any) => b.event && b.event.status === 'active')
          .map((b: any) => {
            const start = new Date(b.event.startTime);
            const end = new Date(b.event.endTime);
            const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
            return {
              id: `muster-${b.id}`,
              date: start.toISOString().split('T')[0],
              title: b.event.title,
              startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
              duration: `${diffMin} min`,
              source: 'muster' as const,
            };
          });
        setEvents((prev) => {
          const imported = prev.filter((e) => e.source === 'imported');
          return [...imported, ...musterEvents];
        });
      })
      .catch(() => {});
  }, [userId, currentUser?.id]);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const openImportModal = useCallback(() => {
    setBatchName('');
    setParsedEvents([]);
    setImportedFileName('');
    setImportModalVisible(true);
  }, []);

  const handleFilePick = useCallback(() => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelected = useCallback((e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseFileContent(text);
        setParsedEvents(parsed);
        if (parsed.length === 0) {
          Alert.alert('No Events Found', 'Could not parse any events from this file. Try a CSV with date and time columns.');
        }
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!batchName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this batch.');
      return;
    }
    if (parsedEvents.length === 0) {
      Alert.alert('No Events', 'Drop a file first to parse events.');
      return;
    }
    const newEvents: CalendarEvent[] = parsedEvents.map((pe) => ({
      id: pe.id,
      date: pe.date,
      title: batchName.trim(),
      startTime: pe.startTime,
      duration: pe.duration,
      source: 'imported' as const,
    }));
    setEvents((prev) => [...prev, ...newEvents]);
    setImportModalVisible(false);
  }, [batchName, parsedEvents]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Calendar marked dates
  const markedDates = events.reduce<Record<string, any>>((acc, evt) => {
    const dotColor = evt.source === 'muster' ? colors.cobalt : colors.pine;
    acc[evt.date] = { ...(acc[evt.date] || {}), marked: true, dotColor };
    return acc;
  }, {} as Record<string, any>);
  if (selectedDate) {
    markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: colors.cobalt };
  }

  const eventsForDay = events.filter((e) => e.date === selectedDate);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Single Import Calendar button */}
        <TouchableOpacity style={styles.importBtn} onPress={openImportModal} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
          <Text style={styles.importBtnText}>Import Calendar</Text>
        </TouchableOpacity>

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

        {/* Events for selected day */}
        {selectedDate ? (
          <View style={styles.daySection}>
            <Text style={styles.daySectionTitle}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {eventsForDay.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={24} color={colors.inkSoft} />
                <Text style={styles.emptyCardText}>No events this day</Text>
              </View>
            ) : (
              eventsForDay.map((evt) => (
                <View key={evt.id} style={styles.eventCard}>
                  <View style={[styles.eventDot, { backgroundColor: evt.source === 'muster' ? colors.cobalt : colors.pine }]} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    <Text style={styles.eventTime}>{evt.startTime} · {evt.duration}</Text>
                    <Text style={styles.eventSource}>{evt.source === 'muster' ? 'Muster Event' : 'Imported'}</Text>
                  </View>
                  {evt.source === 'imported' && (
                    <TouchableOpacity onPress={() => handleDeleteEvent(evt.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.heart} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.daySection}>
            <Text style={styles.emptyCardText}>Tap a day to view events</Text>
          </View>
        )}
      </ScrollView>

      {/* Import Modal */}
      <Modal visible={importModalVisible} transparent animationType="slide" onRequestClose={() => setImportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Calendar</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {/* Batch name */}
            <Text style={styles.fieldLabel}>Batch Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Spring Soccer Schedule"
              placeholderTextColor={colors.inkSoft}
              value={batchName}
              onChangeText={setBatchName}
            />

            {/* Drop zone */}
            <TouchableOpacity style={styles.dropZone} onPress={handleFilePick} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={36} color={colors.cobalt} />
              <Text style={styles.dropZoneText}>
                {importedFileName || 'Drop a file or tap to browse'}
              </Text>
              <Text style={styles.dropZoneHint}>Excel, CSV, or PDF</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef as any}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.txt"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
            )}

            {/* Parsed events list */}
            {parsedEvents.length > 0 && (
              <View style={styles.parsedSection}>
                <Text style={styles.parsedCount}>{parsedEvents.length} event{parsedEvents.length !== 1 ? 's' : ''} found</Text>
                <ScrollView style={styles.parsedList} nestedScrollEnabled>
                  {parsedEvents.map((pe) => (
                    <View key={pe.id} style={styles.parsedRow}>
                      <Text style={styles.parsedDate}>{pe.date}</Text>
                      <Text style={styles.parsedTime}>{pe.startTime}</Text>
                      <Text style={styles.parsedDuration}>{pe.duration}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setImportModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, parsedEvents.length === 0 && styles.modalConfirmBtnDisabled]}
                onPress={handleConfirmImport}
                disabled={parsedEvents.length === 0}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Import {parsedEvents.length > 0 ? `(${parsedEvents.length})` : ''}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 40 },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingVertical: 14,
    borderRadius: 12, backgroundColor: colors.cobalt,
  },
  importBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.white },
  calendar: {
    marginHorizontal: 16, marginTop: 8, borderRadius: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  daySection: { paddingHorizontal: 16, marginTop: 20 },
  daySectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink, marginBottom: 10 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyCardText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 6, textAlign: 'center' },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { fontFamily: fonts.label, fontSize: 14, color: colors.ink },
  eventTime: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  eventSource: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink },
  fieldLabel: { fontFamily: fonts.label, fontSize: 13, color: colors.ink, marginBottom: 6, marginTop: 12 },
  textInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 15, color: colors.ink,
  },
  dropZone: {
    borderWidth: 2, borderColor: colors.cobalt, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, marginTop: 16,
  },
  dropZoneText: { fontFamily: fonts.ui, fontSize: 15, color: colors.cobalt, marginTop: 8 },
  dropZoneHint: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 4 },
  parsedSection: { marginTop: 16 },
  parsedCount: { fontFamily: fonts.label, fontSize: 13, color: colors.ink, marginBottom: 8 },
  parsedList: { maxHeight: 200 },
  parsedRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: colors.surface, borderRadius: 8, marginBottom: 4, gap: 12,
  },
  parsedDate: { fontFamily: fonts.label, fontSize: 13, color: colors.ink, width: 90 },
  parsedTime: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, width: 50 },
  parsedDuration: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontFamily: fonts.ui, fontSize: 14, color: colors.inkSoft },
  modalConfirmBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.cobalt },
  modalConfirmBtnDisabled: { opacity: 0.4 },
  modalConfirmText: { fontFamily: fonts.ui, fontSize: 14, color: colors.white },
});
