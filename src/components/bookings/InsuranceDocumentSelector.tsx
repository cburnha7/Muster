import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fonts, Spacing, useTheme } from '../../theme';
import { useGetInsuranceDocumentsQuery } from '../../store/api/insuranceDocumentsApi';

/**
 * InsuranceDocumentSelector
 *
 * Shown during the reservation flow when `facility.requiresInsurance` is true.
 * Lists only active insurance documents for the user to select from.
 * If no active documents exist, displays a blocking message with a link
 * to the Profile Screen insurance section.
 *
 * Requirements: 4.1, 4.3
 */

interface InsuranceDocumentSelectorProps {
  userId: string;
  onSelect: (documentId: string) => void;
  selectedDocumentId?: string;
}

export function InsuranceDocumentSelector({
  userId,
  onSelect,
  selectedDocumentId,
}: InsuranceDocumentSelectorProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { data: documents, isLoading } = useGetInsuranceDocumentsQuery({
    userId,
    status: 'active',
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Insurance Document</Text>
        <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={colors.cobalt} />
        </View>
      </View>
    );
  }

  const activeDocuments = documents ?? [];

  if (activeDocuments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Insurance Document</Text>
        <View style={[styles.warningCard, { backgroundColor: colors.surface, borderColor: colors.heart + '33' }]}>
          <Ionicons name="warning-outline" size={28} color={colors.heart} />
          <Text style={[styles.warningText, { color: colors.ink }]}>
            You need a valid insurance document to reserve this court
          </Text>
          <TouchableOpacity
            style={styles.profileLink}
            onPress={() =>
              navigation.navigate('Home', { screen: 'ProfileScreen' })
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go to Profile to add insurance document"
          >
            <Ionicons
              name="arrow-forward-circle-outline"
              size={18}
              color={colors.cobalt}
            />
            <Text style={[styles.profileLinkText, { color: colors.cobalt }]}>Add in Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Insurance Document</Text>
      {activeDocuments.map((doc: any) => {
        const isSelected = doc.id === selectedDocumentId;
        return (
          <TouchableOpacity
            key={doc.id}
            style={[
              styles.documentCard, { backgroundColor: colors.surface },
              isSelected && styles.documentCardSelected, isSelected && { borderColor: colors.cobalt, backgroundColor: colors.cobalt + '0D' }]}
            onPress={() => onSelect(doc.id)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${doc.policyName}, expires ${formatDate(doc.expiryDate)}${isSelected ? ', selected' : ''}`}
          >
            <View style={[styles.radioOuter, { borderColor: colors.inkFaint }]}>
              {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.cobalt }]} />}
            </View>
            <View style={styles.documentInfo}>
              <Text
                style={[
                  styles.policyName, { color: colors.ink },
                  isSelected && styles.policyNameSelected, isSelected && { color: colors.cobalt }]}
                numberOfLines={1}
              >
                {doc.policyName}
              </Text>
              <Text style={[styles.expiryDate, { color: colors.inkFaint }]}>
                Expires {formatDate(doc.expiryDate)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    borderRadius: 12,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  warningCard: {
    borderRadius: 12,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  profileLinkText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  documentCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  documentCardSelected: {},
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  documentInfo: {
    flex: 1,
  },
  policyName: {
    fontFamily: fonts.label,
    fontSize: 14,
  },
  policyNameSelected: {},
  expiryDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
