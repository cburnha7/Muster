/**
 * Centralized sport definitions used across the app.
 * Single source of truth for onboarding, settings, filters, and display.
 */

export interface SportDefinition {
  key: string;
  label: string;
  emoji: string;
}

export const ALL_SPORTS: SportDefinition[] = [
  { key: 'badminton', label: 'Badminton', emoji: '🏸' },
  { key: 'baseball', label: 'Baseball', emoji: '⚾' },
  { key: 'basketball', label: 'Basketball', emoji: '🏀' },
  { key: 'cricket', label: 'Cricket', emoji: '🏏' },
  { key: 'cycling', label: 'Cycling', emoji: '🚴' },
  { key: 'flag_football', label: 'Flag Football', emoji: '🏈' },
  { key: 'golf', label: 'Golf', emoji: '⛳' },
  { key: 'hockey', label: 'Hockey', emoji: '🏒' },
  { key: 'kickball', label: 'Kickball', emoji: '🔴' },
  { key: 'lacrosse', label: 'Lacrosse', emoji: '🥍' },
  { key: 'pickleball', label: 'Pickleball', emoji: '🏓' },
  { key: 'rugby', label: 'Rugby', emoji: '🏉' },
  { key: 'running', label: 'Running', emoji: '🏃' },
  { key: 'soccer', label: 'Soccer', emoji: '⚽' },
  { key: 'softball', label: 'Softball', emoji: '🥎' },
  { key: 'swimming', label: 'Swimming', emoji: '🏊' },
  { key: 'table_tennis', label: 'Table Tennis', emoji: '🏓' },
  { key: 'tennis', label: 'Tennis', emoji: '🎾' },
  { key: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { key: 'other', label: 'Other', emoji: '🏅' },
];

/** Get emoji for a sport key */
export const getSportEmoji = (sportKey: string): string => {
  const sport = ALL_SPORTS.find(s => s.key === sportKey?.toLowerCase());
  return sport?.emoji || '🏅';
};

/** Get label for a sport key */
export const getSportLabel = (sportKey: string): string => {
  const sport = ALL_SPORTS.find(s => s.key === sportKey?.toLowerCase());
  return sport?.label || sportKey;
};

/**
 * Filter chip options for list screens (includes "All" option at the front).
 */
export const SPORT_FILTER_OPTIONS = [
  { key: '', label: 'All', emoji: '' },
  ...ALL_SPORTS.filter(s => s.key !== 'other'),
];
