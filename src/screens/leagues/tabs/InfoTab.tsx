import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { leagueService } from '../../../services/api/LeagueService';
import { League, LeagueDocument } from '../../../types/league';
import { colors, Spacing } from '../../../theme';

interface InfoTabProps {
  league: League;
}

export const InfoTab: React.FC<InfoTabProps> = ({ league }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [documents, setDocuments] = useState<LeagueDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [league.id]);

  const loadDocuments = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const docs = await leagueService.getDocuments(league.id);
      setDocuments(docs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDocuments(true);
  };

  const handleViewDocument = (document: LeagueDocument) => {
    navigation.navigate('DocumentViewer', {
      leagueId: league.id,
      documentId: document.id,
      documentName: document.fileName,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  if (error && !isRefreshing) {
    return <ErrorDisplay message={error} onRetry={loadDocuments} />;
  }

  return (
    <ScrollView
      testID="info-tab-scroll-view"
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.cobalt}
          colors={[colors.cobalt]}
        />
      }
    >
      {/* Description Section */}
      {league.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{league.description}</Text>
        </View>
      )}

      {/* Points System Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Points System</Text>
        <View style={styles.pointsContainer}>
          <View style={styles.pointsRow}>
            <View style={styles.pointsItem}>
              <Ionicons name="trophy" size={20} color={colors.cobalt} />
              <Text style={styles.pointsLabel}>Win</Text>
              <Text style={styles.pointsValue}>{league.pointsConfig.win} pts</Text>
            </View>
            <View style={styles.pointsItem}>
              <Ionicons name="remove-circle" size={20} color={colors.inkFaint} />
              <Text style={styles.pointsLabel}>Draw</Text>
              <Text style={styles.pointsValue}>{league.pointsConfig.draw} pts</Text>
            </View>
            <View style={styles.pointsItem}>
              <Ionicons name="close-circle" size={20} color={colors.heart} />
              <Text style={styles.pointsLabel}>Loss</Text>
              <Text style={styles.pointsValue}>{league.pointsConfig.loss} pts</Text>
            </View>
          </View>
        </View>
      </View>

      {/* League Documents Section */}
      {documents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League Documents</Text>
          {documents.map((doc) => {
            const categoryLabel = doc.documentType === 'rules' ? 'League Rules'
              : doc.documentType === 'insurance' ? 'Insurance Policy'
              : 'Other';
            return (
            <View key={doc.id} style={styles.documentCard}>
              <View style={styles.documentInfo}>
                <View style={styles.documentHeader}>
                  <Ionicons name="document-text" size={24} color={colors.cobalt} />
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentName}>{doc.fileName}</Text>
                    <View style={styles.documentMeta}>
                      <Text style={styles.documentCategoryLabel}>{categoryLabel}</Text>
                      <Text style={styles.documentMetaText}> • </Text>
                      <Text style={styles.documentMetaText}>
                        {formatFileSize(doc.fileSize)}
                      </Text>
                      <Text style={styles.documentMetaText}> • </Text>
                      <Text style={styles.documentMetaText}>
                        {formatDate(doc.uploadedAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewDocument(doc)}
              >
                <Text style={styles.viewButtonText}>View</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.cobalt} />
              </TouchableOpacity>
            </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {!league.description && documents.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No additional information available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingVertical: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.mid,
  },
  pointsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: Spacing.lg,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pointsItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.inkFaint,
    fontWeight: '500',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentMetaText: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  documentCategoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cobalt,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cobalt,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cobalt,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
