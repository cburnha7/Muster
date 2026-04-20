import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fonts, Spacing, useTheme } from '../../theme';
import { useUploadInsuranceDocumentMutation } from '../../store/api/insuranceDocumentsApi';

/**
 * InsuranceDocumentForm
 *
 * Modal form for uploading a new insurance document.
 * Includes file picker (PDF/JPEG/PNG, Ã¢â€°Â¤10 MB), policy name input,
 * and expiry date input with client-side validation.
 *
 * Requirements: 1.2, 1.4, 1.5, 1.6
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

interface InsuranceDocumentFormProps {
  userId: string;
  onClose: () => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface FormErrors {
  file?: string | undefined;
  policyName?: string | undefined;
  expiryDate?: string | undefined;
}

export function InsuranceDocumentForm({
  userId,
  onClose,
}: InsuranceDocumentFormProps) {
  const { colors } = useTheme();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [expiryDateText, setExpiryDateText] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const [uploadDocument, { isLoading }] = useUploadInsuranceDocumentMutation();

  const getFileExtension = (uri: string): string => {
    const parts = uri.split('.');
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return (last ?? '').toLowerCase();
  };

  const getMimeType = (ext: string): string => {
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  };

  const handlePickFile = async () => {
    if (Platform.OS !== 'web') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need media library permissions to select insurance documents.'
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as ImagePicker.MediaType[],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ext = getFileExtension(asset.uri);
        const mimeType = asset.mimeType ?? getMimeType(ext);

        if (
          !ALLOWED_MIME_TYPES.includes(mimeType) &&
          !ALLOWED_EXTENSIONS.includes(ext)
        ) {
          setErrors(prev => ({
            ...prev,
            file: 'Only PDF, JPEG, and PNG files are accepted',
          }));
          return;
        }

        if (asset.fileSize != null && asset.fileSize > MAX_FILE_SIZE) {
          setErrors(prev => ({
            ...prev,
            file: 'File must be 10 MB or smaller',
          }));
          return;
        }

        const fileName = asset.fileName ?? `insurance-doc.${ext || 'jpg'}`;

        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          ...(asset.fileSize != null ? { size: asset.fileSize } : {}),
        });
        setErrors(prev => ({ ...prev, file: undefined }));
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick file: ' + err.message);
    }
  };

  const parseExpiryDate = (text: string): Date | null => {
    // Accept YYYY-MM-DD format
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || !match[1] || !match[2] || !match[3]) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    // Verify the date components match (catches invalid dates like Feb 30)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedFile) {
      newErrors.file = 'Document file is required';
    }

    if (!policyName.trim()) {
      newErrors.policyName = 'Policy name is required';
    }

    if (!expiryDateText.trim()) {
      newErrors.expiryDate = 'Expiry date is required';
    } else {
      const parsed = parseExpiryDate(expiryDateText.trim());
      if (!parsed) {
        newErrors.expiryDate = 'Enter a valid date in YYYY-MM-DD format';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed <= today) {
          newErrors.expiryDate = 'Expiry date must be in the future';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      } as any);
      formData.append('policyName', policyName.trim());
      formData.append('expiryDate', expiryDateText.trim());
      formData.append('userId', userId);

      await uploadDocument(formData).unwrap();
      onClose();
    } catch (err: any) {
      const message =
        err?.data?.error || err?.message || 'Upload failed. Please try again.';
      Alert.alert('Upload Failed', message);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.white }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>Add Insurance Document</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* File Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>
              Document File <Text style={[styles.required, { color: colors.heart }]}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.filePicker, { backgroundColor: colors.surface, borderColor: colors.surface }, errors.file && styles.filePickerError, errors.file && { borderColor: colors.heart }]}
              onPress={handlePickFile}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select document file"
            >
              {selectedFile ? (
                <View style={styles.fileSelected}>
                  <Ionicons
                    name="document-attach"
                    size={22}
                    color={colors.cobalt}
                  />
                  <Text style={[styles.fileName, { color: colors.ink }]} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile(null);
                      setErrors(prev => ({ ...prev, file: undefined }));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove selected file"
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.inkFaint}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filePlaceholder}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={28}
                    color={colors.inkFaint}
                  />
                  <Text style={[styles.filePlaceholderText, { color: colors.inkFaint }]}>
                    Tap to select a file
                  </Text>
                  <Text style={[styles.fileHint, { color: colors.inkFaint }]}>
                    PDF, JPEG, or PNG Ã¢â‚¬â€ 10 MB max
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.file && <Text style={[styles.errorText, { color: colors.heart }]}>{errors.file}</Text>}
          </View>

          {/* Policy Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>
              Policy Name <Text style={[styles.required, { color: colors.heart }]}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput, { backgroundColor: colors.surface, borderColor: colors.surface, color: colors.ink },
                errors.policyName && styles.textInputError, errors.policyName && { borderColor: colors.heart }]}
              value={policyName}
              onChangeText={text => {
                setPolicyName(text);
                if (errors.policyName)
                  setErrors(prev => ({ ...prev, policyName: undefined }));
              }}
              placeholder="e.g. General Liability Policy"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="words"
              accessibilityLabel="Policy name"
            />
            {errors.policyName && (
              <Text style={[styles.errorText, { color: colors.heart }]}>{errors.policyName}</Text>
            )}
          </View>

          {/* Expiry Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>
              Expiry Date <Text style={[styles.required, { color: colors.heart }]}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput, { backgroundColor: colors.surface, borderColor: colors.surface, color: colors.ink },
                errors.expiryDate && styles.textInputError, errors.expiryDate && { borderColor: colors.heart }]}
              value={expiryDateText}
              onChangeText={text => {
                setExpiryDateText(text);
                if (errors.expiryDate)
                  setErrors(prev => ({ ...prev, expiryDate: undefined }));
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkFaint}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Expiry date"
            />
            {errors.expiryDate && (
              <Text style={[styles.errorText, { color: colors.heart }]}>{errors.expiryDate}</Text>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.submitButton, { backgroundColor: colors.cobalt },
              isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Upload document"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload"
                  size={20}
                  color={colors.white}
                />
                <Text style={[styles.submitButtonText, { color: colors.white }]}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: Spacing.lg,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  required: {},
  filePicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  filePickerError: {},
  filePlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  filePlaceholderText: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  fileHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  fileSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  fileName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    marginHorizontal: Spacing.sm,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  textInputError: {},
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
