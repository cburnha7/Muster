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
import { colors, fonts, Spacing } from '../../../theme';

export function Step5Policies() {
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
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Policies and waivers</Text>

      {/* Cancellation Policy */}
      <CancellationPolicyPicker
        value={state.cancellationPolicyHours}
        onChange={(v) => setField('cancellationPolicyHours', v)}
      />

      {/* Booking Confirmation */}
      <View style={styles.toggleSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Requires Booking Confirmation</Text>
            <Text style={styles.toggleDescription}>
              All reservation requests must be approved before they are confirmed
            </Text>
          </View>
          <Switch
            value={state.requiresBookingConfirmation}
            onValueChange={(v) => {
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
        <View style={styles.toggleSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Requires Proof of Insurance</Text>
              <Text style={styles.toggleDescription}>
                Renters must attach a valid insurance document when reserving a court
              </Text>
            </View>
            <Switch
              value={state.requiresInsurance}
              onValueChange={(v) => setField('requiresInsurance', v)}
              trackColor={{ false: colors.surface, true: colors.cobalt }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      )}

      {/* Waiver */}
      <View style={styles.toggleSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Waiver Requirement</Text>
            <Text style={styles.toggleDescription}>
              Require players to sign a waiver before booking. Uploading a new version invalidates all previous signatures.
            </Text>
          </View>
          <Switch
            value={state.waiverRequired}
            onValueChange={(v) => {
              setField('waiverRequired', v);
              if (!v) { handleRemoveFile(); }
            }}
            trackColor={{ false: colors.surface, true: colors.cobalt }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {state.waiverRequired && (
        <View style={styles.uploadSection}>
          {state.waiverFileName ? (
            <View style={styles.fileCard}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text-outline" size={24} color={colors.cobalt} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>{state.waiverFileName}</Text>
                  <Text style={styles.fileHint}>PDF waiver</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveFile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={22} color={colors.heart} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={handlePickPdf} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.cobalt} />
              <Text style={styles.uploadText}>Upload Waiver PDF</Text>
              <Text style={styles.uploadHint}>Tap to select a PDF file</Text>
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
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.ink, marginBottom: 24 },
  toggleSection: {
    backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontFamily: fonts.label, fontSize: 15, lineHeight: 22, color: colors.ink, marginBottom: 2 },
  toggleDescription: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  uploadSection: { marginTop: 4 },
  uploadBox: {
    borderWidth: 2, borderColor: colors.cobalt, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  uploadText: { fontFamily: fonts.ui, fontSize: 16, color: colors.cobalt, marginTop: 8 },
  uploadHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 4 },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  fileDetails: { flex: 1 },
  fileName: { fontFamily: fonts.label, fontSize: 15, color: colors.ink },
  fileHint: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
});
