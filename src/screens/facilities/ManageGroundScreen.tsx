import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CourtListManager } from '../../components/facilities/CourtListManager';
import { EditCourtModal } from '../../components/facilities/EditCourtModal';
import { courtService, Court } from '../../services/api/CourtService';
import { Spacing, useTheme } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';

type ManageGroundScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'ManageGround'
>;
type ManageGroundScreenRouteProp = RouteProp<
  FacilitiesStackParamList,
  'ManageGround'
>;

export function ManageGroundScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<ManageGroundScreenNavigationProp>();
  const route = useRoute<ManageGroundScreenRouteProp>();
  const { facilityId, facilityName } = route.params ?? {};

  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);

  useEffect(() => {
    loadCourts();
  }, [facilityId]);

  // Reload courts when screen comes into focus (after adding/editing)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCourts();
    });

    return unsubscribe;
  }, [navigation]);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const data = await courtService.getCourts(facilityId);
      setCourts(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load courts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCourts();
    setRefreshing(false);
  };

  const handleAddCourt = () => {
    navigation.navigate('AddCourt', { facilityId });
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourt(court);
  };

  const handleCloseEditModal = () => {
    setEditingCourt(null);
  };

  const handleEditSuccess = () => {
    loadCourts();
  };

  const handleManageAvailability = () => {
    navigation.navigate('GroundAvailability', {
      facilityId,
      facilityName,
    });
  };

  const handleViewRentals = () => {
    // TODO: Implement when FacilityRentals screen is created
    Alert.alert('Coming Soon', 'Rental management will be available soon');
  };

  const handleEditMap = () => {
    navigation.navigate('FacilityMapEditor', {
      facilityId,
      facilityName,
      // currentMapUrl will be undefined if not set
    });
  };

  const handleCancellationPolicy = () => {
    navigation.navigate('CancellationPolicy', { facilityId });
  };

  const handleViewEscrowLog = () => {
    // TODO: Navigate to rental selection then show EscrowTransactionLog
    Alert.alert(
      'Coming Soon',
      'Escrow transaction logs will be available when rental management is implemented'
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Manage Ground"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title={facilityName}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Quick Actions</Text>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleManageAvailability}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.white }]}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={colors.cobalt}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Manage Availability</Text>
              <Text style={[styles.actionDescription, { color: colors.inkFaint }]}>
                Set availability and block time slots
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.inkFaint}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleViewRentals}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.white }]}>
              <Ionicons name="list-outline" size={24} color={colors.ink} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>View Rentals</Text>
              <Text style={[styles.actionDescription, { color: colors.inkFaint }]}>
                See all upcoming rentals
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.inkFaint}
            />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleEditMap}>
            <View style={[styles.actionIcon, { backgroundColor: colors.white }]}>
              <Ionicons name="map-outline" size={24} color={colors.gold} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Edit Facility Map</Text>
              <Text style={[styles.actionDescription, { color: colors.inkFaint }]}>
                Upload or update facility layout map
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.inkFaint}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleCancellationPolicy}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.white }]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={colors.heart}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Cancellation Policy</Text>
              <Text style={[styles.actionDescription, { color: colors.inkFaint }]}>
                Required before your ground can accept bookings
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.inkFaint}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleViewEscrowLog}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.white }]}>
              <Ionicons name="cash-outline" size={24} color={colors.cobalt} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.ink }]}>Escrow Transactions</Text>
              <Text style={[styles.actionDescription, { color: colors.inkFaint }]}>
                View escrow transaction logs for rentals
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.inkFaint}
            />
          </TouchableOpacity>
        </View>

        {/* Courts List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Courts & Fields</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddCourt}>
              <Ionicons name="add-circle" size={24} color={colors.cobalt} />
              <Text style={[styles.addButtonText, { color: colors.cobalt }]}>Add Court</Text>
            </TouchableOpacity>
          </View>

          <CourtListManager
            courts={courts}
            facilityId={facilityId}
            onCourtUpdated={loadCourts}
            onEditCourt={handleEditCourt}
            onAddCourt={handleAddCourt}
          />
        </View>
      </ScrollView>

      {/* Edit Court Modal */}
      {editingCourt && (
        <EditCourtModal
          visible={true}
          court={editingCourt}
          facilityId={facilityId}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
  },
});
