import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { FormButton } from '../forms/FormButton';
import { DocumentType } from '../../types';
import { colors } from '../../theme';

interface DocumentUploadFormProps {
  onSubmit: (file: File, documentType: DocumentType) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('rules');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const documentTypeOptions: SelectOption[] = [
    { label: 'League Rules', value: 'rules' },
    { label: 'League Insurance Policy', value: 'insurance' },
    { label: 'Other', value: 'other' },
  ];

  const handleFileSelect = () => {
    if (Platform.OS === 'web') {
      // Create file input element (web only)
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          validateFile(file);
        }
      };

      input.click();
    } else {
      Alert.alert(
        'Not Available',
        'File upload is currently only supported on web.'
      );
    }
  };

  const validateFile = (file: File) => {
    const newErrors: Record<string, string> = {};

    // Check file type
    if (file.type !== 'application/pdf') {
      newErrors.file = 'Only PDF files are allowed';
      Alert.alert('Invalid File Type', 'Please select a PDF file');
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      newErrors.file = 'File size must not exceed 10MB';
      Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
      return;
    }

    setErrors({});
    setSelectedFile(file);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedFile) {
      newErrors.file = 'Please select a PDF file';
    }

    if (!documentType) {
      newErrors.documentType = 'Please select a document type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert(
        'Validation Error',
        'Please fix the errors before submitting'
      );
      return;
    }

    if (!selectedFile) return;

    try {
      await onSubmit(selectedFile, documentType);
      setSelectedFile(null);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to upload document'
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Document</Text>
        <Text style={styles.sectionDescription}>
          Upload a PDF document (max 10MB)
        </Text>

        <FormSelect
          label="Document Type *"
          placeholder="Select document type"
          value={documentType}
          options={documentTypeOptions}
          onSelect={option => setDocumentType(option.value as DocumentType)}
          error={errors.documentType}
        />

        <TouchableOpacity
          style={styles.fileSelector}
          onPress={handleFileSelect}
          disabled={loading}
        >
          <Ionicons
            name={selectedFile ? 'document' : 'cloud-upload-outline'}
            size={48}
            color={selectedFile ? colors.cobalt : '#999'}
          />
          {selectedFile ? (
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                {formatFileSize(selectedFile.size)}
              </Text>
            </View>
          ) : (
            <Text style={styles.fileSelectorText}>
              Tap to select a PDF file
            </Text>
          )}
        </TouchableOpacity>

        {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}

        <View style={styles.requirements}>
          <Text style={styles.requirementsTitle}>Requirements:</Text>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.requirementText}>PDF format only</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.requirementText}>Maximum file size: 10MB</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {onCancel && (
          <FormButton
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            disabled={loading}
            style={styles.actionButton}
          />
        )}
        <FormButton
          title="Upload Document"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !selectedFile}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  fileSelector: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  fileSelectorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  fileInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  requirements: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
  },
});
