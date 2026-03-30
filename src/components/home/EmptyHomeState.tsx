import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormButton } from '../forms/FormButton';
import { colors, fonts } from '../../theme';

interface EmptyHomeStateProps {
  userName?: string;
  onCreateEvent: () => void;
}

export function EmptyHomeState({ userName, onCreateEvent }: EmptyHomeStateProps) {
  const greeting = getGreeting();
  const firstName = userName || 'there';

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting}, {firstName}</Text>
      <Text style={styles.message}>
        No games on the schedule yet.{'\n'}Time to get one going.
      </Text>

      <View style={styles.actions}>
        <FormButton
          title="Host a Game"
          onPress={onCreateEvent}
          variant="primary"
          size="large"
          leftIcon="add-circle-outline"
        />
      </View>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  greeting: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.onSurface,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    maxWidth: 280,
  },
});
