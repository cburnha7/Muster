import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { userService } from '../../services/api/UserService';
import { NotificationPreferences } from '../../types';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

export function NotificationPreferencesScreen(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    eventReminders: true,
    eventUpdates: true,
    newEventAlerts: true,
    marketingEmails: false,
    pushNotifications: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const prefs = await userService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await userService.updateNotificationPreferences(preferences);
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadPreferences} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionDescription}>
            Receive notifications on your device about important updates
          </Text>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Enable Push Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Master switch for all push notifications
              </Text>
            </View>
            <Switch
              value={preferences.pushNotifications}
              onValueChange={() => handleToggle('pushNotifications')}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.pushNotifications ? '#3B82F6' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Event Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Notifications</Text>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Event Reminders</Text>
              <Text style={styles.preferenceDescription}>
                Get reminded about upcoming events you've booked
              </Text>
            </View>
            <Switch
              value={preferences.eventReminders}
              onValueChange={() => handleToggle('eventReminders')}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.eventReminders ? '#3B82F6' : '#F3F4F6'}
              disabled={!preferences.pushNotifications}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Event Updates</Text>
              <Text style={styles.preferenceDescription}>
                Notifications about changes to events you're attending
              </Text>
            </View>
            <Switch
              value={preferences.eventUpdates}
              onValueChange={() => handleToggle('eventUpdates')}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.eventUpdates ? '#3B82F6' : '#F3F4F6'}
              disabled={!preferences.pushNotifications}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>New Event Alerts</Text>
              <Text style={styles.preferenceDescription}>
                Get notified about new events matching your interests
              </Text>
            </View>
            <Switch
              value={preferences.newEventAlerts}
              onValueChange={() => handleToggle('newEventAlerts')}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.newEventAlerts ? '#3B82F6' : '#F3F4F6'}
              disabled={!preferences.pushNotifications}
            />
          </View>
        </View>

        {/* Email Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Marketing Emails</Text>
              <Text style={styles.preferenceDescription}>
                Receive promotional emails and special offers
              </Text>
            </View>
            <Switch
              value={preferences.marketingEmails}
              onValueChange={() => handleToggle('marketingEmails')}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences.marketingEmails ? '#3B82F6' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Save Button */}
        <FormButton
          title={saving ? 'Saving...' : 'Save Preferences'}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});