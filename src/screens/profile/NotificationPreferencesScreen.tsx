import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPreferences } from '../../types';
import { FormButton } from '../../components/forms/FormButton';
import { fonts, useTheme } from '../../theme';

const STORAGE_KEY = 'notificationPreferences';

const DEFAULT_PREFS: NotificationPreferences = {
  eventReminders: true,
  eventUpdates: true,
  newEventAlerts: true,
  marketingEmails: false,
  pushNotifications: true,
};

export function NotificationPreferencesScreen(): JSX.Element {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      }
    } catch {
      // Fall back to defaults silently
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const renderToggle = (
    label: string,
    description: string,
    key: keyof NotificationPreferences,
    disabled = false,
    isLast = false
  ) => (
    <View
      style={[
        styles.preferenceItem,
        { borderBottomColor: colors.border + '60' },
        isLast && styles.preferenceItemLast,
      ]}
    >
      <View style={styles.preferenceInfo}>
        <Text style={[styles.preferenceLabel, { color: colors.ink }]}>
          {label}
        </Text>
        <Text
          style={[styles.preferenceDescription, { color: colors.inkSecondary }]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={preferences[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{
          false: colors.border,
          true: colors.cobalt + '50',
        }}
        thumbColor={preferences[key] ? colors.cobalt : colors.surface}
        disabled={disabled}
        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
      />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Push Notifications */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>
        Push Notifications
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        <Text style={[styles.cardDescription, { color: colors.inkSecondary }]}>
          Receive notifications on your device about important updates
        </Text>
        {renderToggle(
          'Enable Push Notifications',
          'Master switch for all push notifications',
          'pushNotifications',
          false,
          true
        )}
      </View>

      {/* Event Notifications */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>
        Event Notifications
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        {renderToggle(
          'Event Reminders',
          'Get reminded about upcoming events',
          'eventReminders',
          !preferences.pushNotifications
        )}
        {renderToggle(
          'Event Updates',
          "Changes to events you're attending",
          'eventUpdates',
          !preferences.pushNotifications
        )}
        {renderToggle(
          'New Event Alerts',
          'New events matching your interests',
          'newEventAlerts',
          !preferences.pushNotifications,
          true
        )}
      </View>

      {/* Email Notifications */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>
        Email
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        {renderToggle(
          'Marketing Emails',
          'Promotional emails and special offers',
          'marketingEmails',
          false,
          true
        )}
      </View>

      {/* Save Button */}
      <FormButton
        title={saving ? 'Saving...' : 'Save Preferences'}
        onPress={handleSave}
        disabled={saving}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  preferenceItemLast: {
    borderBottomWidth: 0,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 12,
  },
  preferenceLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 2,
  },
  preferenceDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 24,
  },
});
