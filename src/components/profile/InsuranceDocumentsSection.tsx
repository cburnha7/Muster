import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
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
  const { data: documents, isLoading } = useGetInsuranceDocumentsQuery({ userId });

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
        <Text style={styles.sectionTitle}>Insurance Documents</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.pine} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Insurance Documents</Text>

      {(!documents || documents.length === 0) ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={32} color={colors.inkFaint} />
          <Text style={styles.emptyText}>
            No insurance documents yet. Add one to attach to court reservations.
          </Text>
        </View>
      ) : (
        documents.map((doc: any) => {
          const isExpired = doc.status === 'expired';
          return (
            <View
              key={doc.id}
              style={[styles.documentCard, isExpired && styles.documentCardExpired]}
              accessibilityLabel={`${doc.policyName}, expires ${formatDate(doc.expiryDate)}, ${isExpired ? 'expired' : 'active'}`}
            >
              <View style={styles.documentInfo}>
                <Text
                  style={[styles.policyName, isExpired && styles.textExpired]}
                  numberOfLines={1}
                >
                  {doc.policyName}
                </Text>
                <Text style={[styles.expiryDate, isExpired && styles.textExpired]}>
                  Expires {formatDate(doc.expiryDate)}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  isExpired ? styles.badgeExpired : styles.badgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isExpired ? styles.badgeTextExpired : styles.badgeTextActive,
                  ]}
                >
                  {isExpired ? 'Expired' : 'Active'}
                </Text>
              </View>
            </View>
          );
        })
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddDocument}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add Insurance Document"
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.pine} />
        <Text style={styles.addButtonText}>Add Insurance Document</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  documentCard: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    padding: 14,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
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
    color: colors.ink,
  },
  expiryDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  textExpired: {
    color: colors.inkFaint,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: colors.pine + '1A', // 10% opacity pine
  },
  badgeExpired: {
    backgroundColor: colors.inkFaint + '1A', // 10% opacity
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  badgeTextActive: {
    color: colors.pine,
  },
  badgeTextExpired: {
    color: colors.inkFaint,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: Spacing.sm,
    backgroundColor: colors.chalk,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.pine,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.pine,
    marginLeft: Spacing.sm,
  },
});
