import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { OnboardingStackScreenProps } from '../../navigation/types';

interface GetStartedScreenProps extends OnboardingStackScreenProps<'GetStarted'> {
  onComplete: () => void;
}

export function GetStartedScreen({ navigation, onComplete }: GetStartedScreenProps): JSX.Element {
  const handleGetStarted = () => {
    onComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🎉</Text>
          </View>

          <Text style={styles.title}>You're All Set!</Text>
          <Text style={styles.subtitle}>
            Ready to discover amazing sporting events and connect with rosters in your area.
          </Text>

          {/* Feature Highlights */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Discover local events</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Book facilities easily</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Join rosters and leagues</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Manage your bookings</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
            <Text style={styles.primaryButtonText}>Start Exploring</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconText: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 16,
    color: '#10B981',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
});