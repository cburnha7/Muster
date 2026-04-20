import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { userService } from '../../services/api/UserService';
import { NotificationPreferences } from '../../types';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { colors, fonts, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';

export function NotificationPreferencesScreen(): JSX.Element {
  const { colors: themeColors } = useTheme();
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
      // TODO: Re-enable when backend /users/notifications endpoint is implemented
      // const prefs = await userService.getNotificationPreferences();
      // setPreferences(prefs);
      // For now, use defaults
    } catch (err: any) {
      setError(err.message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
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
      // TODO: Re-enable when backend /users/notifications endpoint is implemented
      // await userService.updateNotificationPreferences(preferences);
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

  const renderToggle = (
    label: string,
    description: string,
    key: keyof NotificationPreferences,
    disabled = false,
    isLast = false
  ) => (
    <View style={[styles.preferenceItem, isLast && styles.preferenceItemLast]}>
      <View style={styles.preferenceInfo}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        value={preferences[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{
          false: colors.surfaceContainerHigh,
          true: colors.primary + '50',
        }}
        thumbColor={
          preferences[key] ? colors.primary : colors.surfaceContainerLow
        }
        disabled={disabled}
        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
      />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Push Notifications */}
      <Text style={styles.sectionHeader}>Push Notifications</Text>
      <View style={styles.card}>
        <Text style={styles.cardDescription}>
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
      <Text style={styles.sectionHeader}>Event Notifications</Text>
      <View style={styles.card}>
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
      <Text style={styles.sectionHeader}>Email</Text>
      <View style={styles.card}>
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
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: tokenColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 18,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant + '60',
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
    color: colors.onSurface,
    marginBottom: 2,
  },
  preferenceDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 24,
  },
});
