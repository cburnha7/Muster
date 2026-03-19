import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../forms/FormInput';
import { FormButton } from '../forms/FormButton';
import { BoardMember } from '../../types';
import { colors } from '../../theme';

interface CertificationFormProps {
  onSubmit: (bylawsFile: File, boardMembers: BoardMember[]) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const CertificationForm: React.FC<CertificationFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [bylawsFile, setBylawsFile] = useState<File | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([
    { name: '', role: '' },
    { name: '', role: '' },
    { name: '', role: '' },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileSelect = () => {
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
  };

  const validateFile = (file: File) => {
    const newErrors = { ...errors };

    if (file.type !== 'application/pdf') {
      newErrors.bylaws = 'Only PDF files are allowed';
      Alert.alert('Invalid File Type', 'Please select a PDF file');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      newErrors.bylaws = 'File size must not exceed 10MB';
      Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
      return;
    }

    delete newErrors.bylaws;
    setErrors(newErrors);
    setBylawsFile(file);
  };

  const handleBoardMemberChange = (index: number, field: 'name' | 'role', value: string) => {
    const updated = [...boardMembers];
    updated[index][field] = value;
    setBoardMembers(updated);
  };

  const addBoardMember = () => {
    setBoardMembers([...boardMembers, { name: '', role: '' }]);
  };

  const removeBoardMember = (index: number) => {
    if (boardMembers.length <= 3) {
      Alert.alert('Minimum Required', 'At least 3 board members are required');
      return;
    }
    const updated = boardMembers.filter((_, i) => i !== index);
    setBoardMembers(updated);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!bylawsFile) {
      newErrors.bylaws = 'Bylaws document is required';
    }

    const validMembers = boardMembers.filter(m => m.name.trim() && m.role.trim());
    if (validMembers.length < 3) {
      newErrors.boardMembers = 'At least 3 board members with name and role are required';
    }

    boardMembers.forEach((member, index) => {
      if (member.name.trim() && !member.role.trim()) {
        newErrors[`role_${index}`] = 'Role is required';
      }
      if (!member.name.trim() && member.role.trim()) {
        newErrors[`name_${index}`] = 'Name is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    if (!bylawsFile) return;

    const validMembers = boardMembers.filter(m => m.name.trim() && m.role.trim());

    Alert.alert(
      'Confirm Certification',
      `Are you sure you want to submit for certification?\n\nThis will include:\n- Bylaws document\n- ${validMembers.length} board members\n\nOnce certified, your league will receive a certification badge.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await onSubmit(bylawsFile, validMembers);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit certification');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>League Certification</Text>
        <Text style={styles.sectionDescription}>
          Submit your league for certification by providing bylaws and board of directors information
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>Bylaws Document *</Text>
        
        <TouchableOpacity
          style={styles.fileSelector}
          onPress={handleFileSelect}
          disabled={loading}
        >
          <Ionicons 
            name={bylawsFile ? 'document' : 'cloud-upload-outline'} 
            size={48} 
            color={bylawsFile ? colors.pine : '#999'} 
          />
          {bylawsFile ? (
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{bylawsFile.name}</Text>
              <Text style={styles.fileSize}>{formatFileSize(bylawsFile.size)}</Text>
            </View>
          ) : (
            <Text style={styles.fileSelectorText}>
              Tap to upload bylaws PDF
            </Text>
          )}
        </TouchableOpacity>

        {errors.bylaws && (
          <Text style={styles.errorText}>{errors.bylaws}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Board of Directors *</Text>
          <Text style={styles.subsectionSubtitle}>(Minimum 3 members)</Text>
        </View>

        {errors.boardMembers && (
          <Text style={styles.errorText}>{errors.boardMembers}</Text>
        )}

        {boardMembers.map((member, index) => (
          <View key={index} style={styles.boardMemberCard}>
            <View style={styles.boardMemberHeader}>
              <Text style={styles.boardMemberTitle}>Member {index + 1}</Text>
              {boardMembers.length > 3 && (
                <TouchableOpacity
                  onPress={() => removeBoardMember(index)}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            <FormInput
              label="Name *"
              placeholder="Enter member name"
              value={member.name}
              onChangeText={(value) => handleBoardMemberChange(index, 'name', value)}
              error={errors[`name_${index}`]}
            />

            <FormInput
              label="Role *"
              placeholder="e.g., President, Secretary, Treasurer"
              value={member.role}
              onChangeText={(value) => handleBoardMemberChange(index, 'role', value)}
              error={errors[`role_${index}`]}
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={addBoardMember}
          disabled={loading}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.pine} />
          <Text style={styles.addButtonText}>Add Board Member</Text>
        </TouchableOpacity>
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
          title="Submit for Certification"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  subsectionHeader: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subsectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  fileSelector: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    marginTop: 8,
  },
  boardMemberCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  boardMemberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardMemberTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.pine,
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.pine,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
