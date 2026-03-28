import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { colors, fonts, Spacing } from '../../theme';
import { SportType } from '../../types';
import { searchEventBus } from '../../utils/searchEventBus';

const SPORT_OPTIONS: SelectOption[] = [
  { label: 'All Sports', value: '' },
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Kickball', value: SportType.KICKBALL },
  { label: 'Other', value: SportType.OTHER },
];

export interface TabSearchResult {
  id: string;
  name: string;
  subtitle?: string;
}

interface TabSearchModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  onSearch: (query: string, sport: SportType | null) => Promise<TabSearchResult[]>;
  onResultPress: (result: TabSearchResult) => void;
  createLabel?: string;
  onCreatePress?: () => void;
}
