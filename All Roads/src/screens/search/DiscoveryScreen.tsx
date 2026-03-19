import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { searchService, RecommendationParams } from '../../services/search';
import { Event, Facility, Team } from '../../types';
import { EventCard } from '../../components/ui/EventCard';
import { FacilityCard } from '../../components/ui/FacilityCard';
import { TeamCard } from '../../components/ui/TeamCard';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { colors } from '../../theme';

interface DiscoveryScreenProps {
  navigation: any;
}

export function DiscoveryScreen({ navigation }: DiscoveryScreenProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  // Location data
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Discovery results
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [nearbyTeams, setNearbyTeams] = useState<Team[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [popularFacilities, setPopularFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    initializeDiscovery();
  }, []);

  const initializeDiscovery = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        // Get user location
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Load nearby content
        await loadNearbyContent(location.coords.latitude, location.coords.longitude);
      }

      // Load recommendations and trending content (doesn't require location)
      await loadRecommendations();
      await loadTrendingContent();
    } catch (err: any) {
      setError(err.message || 'Failed to load discovery content');
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyContent = async (latitude: number, longitude: number) => {
    try {
      const radius = 10; // 10km radius

      const [events, facilities, teams] = await Promise.all([
        searchService.getNearbyEvents(latitude, longitude, radius),
        searchService.getNearbyFacilities(latitude, longitude, radius),
        searchService.getNearbyTeams(latitude, longitude, radius),
      ]);

      setNearbyEvents(events.slice(0, 5));
      setNearbyFacilities(facilities.slice(0, 5));
      setNearbyTeams(teams.slice(0, 5));
    } catch (err: any) {
      console.error('Failed to load nearby content:', err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const params: RecommendationParams = {
        limit: 5,
        includeEvents: true,
        includeFacilities: false,
        includeTeams: false,
        basedOn: 'preferences',
      };

      const result = await searchService.getRecommendations(params);
      if (result.events) {
        setRecommendedEvents(result.events);
      }
    } catch (err: any) {
      console.error('Failed to load recommendations:', err);
    }
  };

  const loadTrendingContent = async () => {
    try {
      const [trending, popular] = await Promise.all([
        searchService.getTrendingEvents(5),
        searchService.getPopularFacilities(5),
      ]);

      setTrendingEvents(trending);
      setPopularFacilities(popular);
    } catch (err: any) {
      console.error('Failed to load trending content:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeDiscovery();
    setRefreshing(false);
  };

  const handleRequestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationPermission(true);
      await initializeDiscovery();
    } else {
      Alert.alert(
        'Location Permission',
        'Location permission is required to discover nearby events and facilities.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  const handleFacilityPress = (facility: Facility) => {
    navigation.navigate('FacilityDetails', { facilityId: facility.id });
  };

  const handleTeamPress = (team: Team) => {
    navigation.navigate('TeamDetails', { teamId: team.id });
  };

  const handleSeeAll = (section: string) => {
    navigation.navigate('SearchResults', {
      query: '',
      searchType: section === 'events' ? 'events' : section === 'facilities' ? 'facilities' : 'teams',
    });
  };

  const renderSection = (
    title: string,
    items: any[],
    renderItem: (item: any) => JSX.Element,
    onSeeAll?: () => void
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {onSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {items.map((item, index) => (
            <View key={item.id || index} style={styles.horizontalItem}>
              {renderItem(item)}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading discovery content...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={initializeDiscovery}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {!locationPermission && (
        <View style={styles.locationPrompt}>
          <Ionicons name="location-outline" size={32} color="#007AFF" />
          <Text style={styles.locationPromptTitle}>Enable Location</Text>
          <Text style={styles.locationPromptText}>
            Discover events and facilities near you
          </Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleRequestLocation}
          >
            <Text style={styles.locationButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderSection(
        'Nearby Events',
        nearbyEvents,
        (event) => (
          <EventCard
            event={event}
            onPress={() => handleEventPress(event)}
            compact
          />
        ),
        () => handleSeeAll('events')
      )}

      {renderSection(
        'Recommended for You',
        recommendedEvents,
        (event) => (
          <EventCard
            event={event}
            onPress={() => handleEventPress(event)}
            compact
          />
        ),
        () => handleSeeAll('events')
      )}

      {renderSection(
        'Trending Events',
        trendingEvents,
        (event) => (
          <EventCard
            event={event}
            onPress={() => handleEventPress(event)}
            compact
          />
        ),
        () => handleSeeAll('events')
      )}

      {renderSection(
        'Nearby Facilities',
        nearbyFacilities,
        (facility) => (
          <FacilityCard
            facility={facility}
            onPress={() => handleFacilityPress(facility)}
            compact
          />
        ),
        () => handleSeeAll('facilities')
      )}

      {renderSection(
        'Popular Facilities',
        popularFacilities,
        (facility) => (
          <FacilityCard
            facility={facility}
            onPress={() => handleFacilityPress(facility)}
            compact
          />
        ),
        () => handleSeeAll('facilities')
      )}

      {renderSection(
        'Nearby Rosters',
        nearbyTeams,
        (team) => (
          <TeamCard
            team={team}
            onPress={() => handleTeamPress(team)}
            compact
          />
        ),
        () => handleSeeAll('teams')
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.chalkWarm,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  locationPrompt: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  locationPromptText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  horizontalItem: {
    marginRight: 12,
    width: 280,
  },
});
