import React, { useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CancellationPolicyPicker } from '../../../components/facilities/CancellationPolicyPicker';
import { useCreateFacility } from './CreateFacilityContext';
import { fonts, Spacing, useTheme } from '../../../theme';

export function Step5Policies() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateFacility();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setField = (field: string, value: any) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const handlePickPdf = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected = (e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }
    const uri = URL.createObjectURL(file);
    setField('waiverFileName', file.name);
    setField('waiverFileUri', uri);
  };

  const handleRemoveFile = () => {
    setField('waiverFileName', '');
    setField('waiverFileUri', '');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>Policies and waivers</Text>

      {/* Cancellation Policy */}
      <CancellationPolicyPicker
        value={state.cancellationPolicyHours}
        onChange={v => setField('cancellationPolicyHours', v)}
      />

      {/* Booking Confirmation */}
      <View style={[styles.toggleSection, { backgroundColor: colors.surface }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: colors.ink }]}>
              Requires Booking Confirmation
            </Text>
            <Text style={[styles.toggleDescription, { color: colors.inkSoft }]}>
              All reservation requests must be approved before they are
              confirmed
            </Text>
          </View>
          <Switch
            value={state.requiresBookingConfirmation}
            onValueChange={v => {
              setField('requiresBookingConfirmation', v);
              if (!v) setField('requiresInsurance', false);
            }}
            trackColor={{ false: colors.surface, true: colors.cobalt }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Insurance — only when confirmation is on */}
      {state.requiresBookingConfirmation && (
        <View style={[styles.toggleSection, { backgroundColor: colors.surface }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.ink }]}>
                Requires Proof of Insurance
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.inkSoft }]}>
                Renters must attach a valid insurance document when reserving a
                court
              </Text>
            </View>
            <Switch
              value={state.requiresInsurance}
              onValueChange={v => setField('requiresInsurance', v)}
              trackColor={{ false: colors.surface, true: colors.cobalt }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      )}

      {/* Waiver */}
      <View style={[styles.toggleSection, { backgroundColor: colors.surface }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: colors.ink }]}>Waiver Requirement</Text>
            <Text style={[styles.toggleDescription, { color: colors.inkSoft }]}>
              Require players to sign a waiver before booking. Uploading a new
              version invalidates all previous signatures.
            </Text>
          </View>
          <Switch
            value={state.waiverRequired}
            onValueChange={v => {
              setField('waiverRequired', v);
              if (!v) {
                handleRemoveFile();
              }
            }}
            trackColor={{ false: colors.surface, true: colors.cobalt }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {state.waiverRequired && (
        <View style={styles.uploadSection}>
          {state.waiverFileName ? (
            <View style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.fileInfo}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={colors.cobalt}
                />
                <View style={styles.fileDetails}>
                  <Text style={[styles.fileName, { color: colors.ink }]} numberOfLines={1}>
                    {state.waiverFileName}
                  </Text>
                  <Text style={[styles.fileHint, { color: colors.inkSoft }]}>PDF waiver</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleRemoveFile}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color={colors.heart} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadBox, { borderColor: colors.cobalt, backgroundColor: colors.surface }]}
              onPress={handlePickPdf}
              activeOpacity={0.7}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={32}
                color={colors.cobalt}
              />
              <Text style={[styles.uploadText, { color: colors.cobalt }]}>Upload Waiver PDF</Text>
              <Text style={[styles.uploadHint, { color: colors.inkSoft }]}>Tap to select a PDF file</Text>
            </TouchableOpacity>
          )}

          {/* Hidden file input for web */}
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef as any}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
  toggleSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: {
    fontFamily: fonts.label,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 2,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  uploadSection: { marginTop: 4 },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    marginTop: 8,
  },
  uploadHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  fileDetails: { flex: 1 },
  fileName: { fontFamily: fonts.label, fontSize: 15 },
  fileHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
