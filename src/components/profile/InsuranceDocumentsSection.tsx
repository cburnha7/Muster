import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { fonts, Spacing, useTheme } from '../../theme';
import { useGetInsuranceDocumentsQuery } from '../../store/api/insuranceDocumentsApi';

/**
 * InsuranceDocumentsSection
 *
 * Displays the user's insurance documents on the ProfileScreen.
 * Lists all documents with status badges — expired documents are
 * grayed out with an "Expired" label, active ones show a green badge.
 * Provides an "Add Insurance Document" button.
 *
 * Requirements: 1.1, 2.2
 */

interface InsuranceDocumentsSectionProps {
  userId: string;
  onAddDocument: () => void;
}

export function InsuranceDocumentsSection({
  userId,
  onAddDocument,
}: InsuranceDocumentsSectionProps) {
  const { colors } = useTheme();
  const { data: documents, isLoading } = useGetInsuranceDocumentsQuery({
    userId,
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
        <ActivityIndicator size="small" color={colors.cobalt} />
      </View>
    );
  }

  return (
    <CollapsibleSection
      title="Insurance Documents"
      count={documents?.length || 0}
    >
      <View style={styles.container}>
        {!documents || documents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
            <Ionicons
              name="document-text-outline"
              size={32}
              color={colors.inkFaint}
            />
            <Text style={[styles.emptyText, { color: colors.inkFaint }]}>
              No insurance documents yet. Add one to attach to court
              reservations.
            </Text>
          </View>
        ) : (
          documents.map((doc: any) => {
            const isExpired = doc.status === 'expired';
            return (
              <View
                key={doc.id}
                style={[
                  styles.documentCard, { backgroundColor: colors.surface, shadowColor: colors.black },
                  isExpired && styles.documentCardExpired]}
                accessibilityLabel={`${doc.policyName}, expires ${formatDate(doc.expiryDate)}, ${isExpired ? 'expired' : 'active'}`}
              >
                <View style={styles.documentInfo}>
                  <Text
                    style={[styles.policyName, { color: colors.ink }, isExpired && styles.textExpired, isExpired && { color: colors.inkFaint }]}
                    numberOfLines={1}
                  >
                    {doc.policyName}
                  </Text>
                  <Text
                    style={[styles.expiryDate, { color: colors.inkFaint }, isExpired && styles.textExpired, isExpired && { color: colors.inkFaint }]}
                  >
                    Expires {formatDate(doc.expiryDate)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    isExpired ? styles.badgeExpired : styles.badgeActive, isExpired ? { backgroundColor: colors.inkFaint + '1A' } : {}]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isExpired
                        ? styles.badgeTextExpired
                        : styles.badgeTextActive, isExpired ? { color: colors.inkFaint } : {}]}
                  >
                    {isExpired ? 'Expired' : 'Active'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.cobalt }]}
          onPress={onAddDocument}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add Insurance Document"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.cobalt} />
          <Text style={[styles.addButtonText, { color: colors.cobalt }]}>Add Insurance Document</Text>
        </TouchableOpacity>
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    borderRadius: 12,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyCard: {
    borderRadius: 12,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  documentCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  documentCardExpired: {
    opacity: 0.5,
  },
  documentInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  policyName: {
    fontFamily: fonts.label,
    fontSize: 14,
  },
  expiryDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  textExpired: {},
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  badgeActive: {
    // 10% opacity pine,
  },
  badgeExpired: {
    // 10% opacity,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  badgeTextActive: {},
  badgeTextExpired: {},
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
});
