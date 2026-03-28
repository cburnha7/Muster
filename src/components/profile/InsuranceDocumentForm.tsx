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
import { colors, fonts, Spacing } from '../../theme';
import { useUploadInsuranceDocumentMutation } from '../../store/api/insuranceDocumentsApi';

/**
 * InsuranceDocumentForm
 *
 * Modal form for uploading a new insurance document.
 * Includes file picker (PDF/JPEG/PNG, ≤10 MB), policy name input,
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

export function InsuranceDocumentForm({ userId, onClose }: InsuranceDocumentFormProps) {
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
      case 'pdf': return 'application/pdf';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/octet-stream';
    }
  };

  const handlePickFile = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need media library permissions to select insurance documents.',
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ext = getFileExtension(asset.uri);
        const mimeType = asset.mimeType ?? getMimeType(ext);

        if (!ALLOWED_MIME_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(ext)) {
          setErrors((prev) => ({ ...prev, file: 'Only PDF, JPEG, and PNG files are accepted' }));
          return;
        }

        if (asset.fileSize != null && asset.fileSize > MAX_FILE_SIZE) {
          setErrors((prev) => ({ ...prev, file: 'File must be 10 MB or smaller' }));
          return;
        }

        const fileName = asset.fileName ?? `insurance-doc.${ext || 'jpg'}`;

        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          ...(asset.fileSize != null ? { size: asset.fileSize } : {}),
        });
        setErrors((prev) => ({ ...prev, file: undefined }));
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
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
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
      const message = err?.data?.error || err?.message || 'Upload failed. Please try again.';
      Alert.alert('Upload Failed', message);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Insurance Document</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* File Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Document File <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.filePicker, errors.file && styles.filePickerError]}
              onPress={handlePickFile}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select document file"
            >
              {selectedFile ? (
                <View style={styles.fileSelected}>
                  <Ionicons name="document-attach" size={22} color={colors.pine} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile(null);
                      setErrors((prev) => ({ ...prev, file: undefined }));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove selected file"
                  >
                    <Ionicons name="close-circle" size={20} color={colors.inkFaint} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filePlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.inkFaint} />
                  <Text style={styles.filePlaceholderText}>Tap to select a file</Text>
                  <Text style={styles.fileHint}>PDF, JPEG, or PNG — 10 MB max</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}
          </View>

          {/* Policy Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Policy Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, errors.policyName && styles.textInputError]}
              value={policyName}
              onChangeText={(text) => {
                setPolicyName(text);
                if (errors.policyName) setErrors((prev) => ({ ...prev, policyName: undefined }));
              }}
              placeholder="e.g. General Liability Policy"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="words"
              accessibilityLabel="Policy name"
            />
            {errors.policyName && <Text style={styles.errorText}>{errors.policyName}</Text>}
          </View>

          {/* Expiry Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Expiry Date <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, errors.expiryDate && styles.textInputError]}
              value={expiryDateText}
              onChangeText={(text) => {
                setExpiryDateText(text);
                if (errors.expiryDate) setErrors((prev) => ({ ...prev, expiryDate: undefined }));
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkFaint}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Expiry date"
            />
            {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Upload document"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Upload Document</Text>
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
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
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
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  required: {
    color: colors.heart,
  },
  filePicker: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  filePickerError: {
    borderColor: colors.heart,
  },
  filePlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  filePlaceholderText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: Spacing.sm,
  },
  fileHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
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
    color: colors.ink,
    marginHorizontal: Spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  textInputError: {
    borderColor: colors.heart,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.heart,
    marginTop: Spacing.xs,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  submitButton: {
    backgroundColor: colors.pine,
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
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
});
