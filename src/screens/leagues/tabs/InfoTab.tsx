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
import { Spacing, useTheme } from '../../../theme';

interface InfoTabProps {
  league: League;
}

export const InfoTab: React.FC<InfoTabProps> = ({ league }) => {
  const { colors } = useTheme();
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load documents';
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
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
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
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>About</Text>
          <Text style={[styles.description, { color: colors.inkSecondary }]}>{league.description}</Text>
        </View>
      )}

      {/* Points System Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Points System</Text>
        <View style={[styles.pointsContainer, { backgroundColor: colors.bgSubtle }]}>
          <View style={styles.pointsRow}>
            <View style={styles.pointsItem}>
              <Ionicons name="trophy" size={20} color={colors.cobalt} />
              <Text style={[styles.pointsLabel, { color: colors.inkFaint }]}>Win</Text>
              <Text style={[styles.pointsValue, { color: colors.ink }]}>
                {league.pointsConfig.win} pts
              </Text>
            </View>
            <View style={styles.pointsItem}>
              <Ionicons
                name="remove-circle"
                size={20}
                color={colors.inkFaint}
              />
              <Text style={[styles.pointsLabel, { color: colors.inkFaint }]}>Draw</Text>
              <Text style={[styles.pointsValue, { color: colors.ink }]}>
                {league.pointsConfig.draw} pts
              </Text>
            </View>
            <View style={styles.pointsItem}>
              <Ionicons name="close-circle" size={20} color={colors.heart} />
              <Text style={[styles.pointsLabel, { color: colors.inkFaint }]}>Loss</Text>
              <Text style={[styles.pointsValue, { color: colors.ink }]}>
                {league.pointsConfig.loss} pts
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* League Documents Section */}
      {documents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>League Documents</Text>
          {documents.map(doc => {
            const categoryLabel =
              doc.documentType === 'rules'
                ? 'League Rules'
                : doc.documentType === 'insurance'
                  ? 'Insurance Policy'
                  : 'Other';
            return (
              <View key={doc.id} style={[styles.documentCard, { backgroundColor: colors.bgSubtle }]}>
                <View style={styles.documentInfo}>
                  <View style={styles.documentHeader}>
                    <Ionicons
                      name="document-text"
                      size={24}
                      color={colors.cobalt}
                    />
                    <View style={styles.documentDetails}>
                      <Text style={[styles.documentName, { color: colors.ink }]}>{doc.fileName}</Text>
                      <View style={styles.documentMeta}>
                        <Text style={[styles.documentCategoryLabel, { color: colors.cobalt }]}>
                          {categoryLabel}
                        </Text>
                        <Text style={[styles.documentMetaText, { color: colors.inkFaint }]}> • </Text>
                        <Text style={[styles.documentMetaText, { color: colors.inkFaint }]}>
                          {formatFileSize(doc.fileSize)}
                        </Text>
                        <Text style={[styles.documentMetaText, { color: colors.inkFaint }]}> • </Text>
                        <Text style={[styles.documentMetaText, { color: colors.inkFaint }]}>
                          {formatDate(doc.uploadedAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.viewButton, { backgroundColor: colors.surface, borderColor: colors.cobalt }]}
                  onPress={() => handleViewDocument(doc)}
                >
                  <Text style={[styles.viewButtonText, { color: colors.cobalt }]}>View</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.cobalt}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {!league.description && documents.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons
            name="information-circle-outline"
            size={64}
            color={colors.inkMuted}
          />
          <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>
            No additional information available
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  pointsContainer: {
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
    fontWeight: '500',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentMetaText: {
    fontSize: 13,
  },
  documentCategoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 16,
    textAlign: 'center',
  },
});
