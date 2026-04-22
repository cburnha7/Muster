import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';

interface AddressResult {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  formatted: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelected: (address: AddressResult) => void;
  placeholder?: string;
  label?: string;
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onAddressSelected,
  placeholder = 'Start typing an address...',
  label = 'Address',
}: AddressAutocompleteProps) {
  const { colors } = useTheme();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    (text: string) => {
      const url =
        Platform.OS === 'web'
          ? `${API_BASE_URL}/places/autocomplete?input=${encodeURIComponent(text)}`
          : `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&key=${apiKey}`;

      setLoading(true);
      fetch(url)
        .then(r => r.json())
        .then(data => {
          setSuggestions(data.predictions || []);
        })
        .catch(err => {
          console.error('Address autocomplete fetch error:', err);
          setSuggestions([]);
        })
        .finally(() => setLoading(false));
    },
    [apiKey]
  );

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);

      // Debounce: wait 300ms after last keystroke before fetching
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.length >= 3 && (apiKey || Platform.OS === 'web')) {
        debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
      } else {
        setSuggestions([]);
      }
    },
    [apiKey, onChangeText, fetchSuggestions]
  );

  const handleSelect = useCallback(
    (suggestion: any) => {
      onChangeText(suggestion.description);
      setSuggestions([]);

      if ((apiKey || Platform.OS === 'web') && suggestion.place_id) {
        const url =
          Platform.OS === 'web'
            ? `${API_BASE_URL}/places/details?place_id=${encodeURIComponent(suggestion.place_id)}`
            : `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(suggestion.place_id)}&fields=address_components,geometry&key=${apiKey}`;
        fetch(url)
          .then(r => r.json())
          .then(data => {
            const components = data.result?.address_components || [];
            const geo = data.result?.geometry?.location;
            let street = '';
            let city = '';
            let state = '';
            let zip = '';
            for (const c of components) {
              if (c.types.includes('street_number')) street = c.long_name + ' ';
              if (c.types.includes('route')) street += c.long_name;
              if (c.types.includes('locality')) city = c.long_name;
              if (c.types.includes('administrative_area_level_1'))
                state = c.short_name;
              if (c.types.includes('postal_code')) zip = c.long_name;
            }
            onAddressSelected({
              street: street.trim(),
              city,
              state,
              zipCode: zip,
              latitude: geo?.lat,
              longitude: geo?.lng,
              formatted: suggestion.description,
            });
          })
          .catch(() => {
            onAddressSelected({
              street: '',
              city: '',
              state: '',
              zipCode: '',
              formatted: suggestion.description,
            });
          });
      }
    },
    [apiKey, onChangeText, onAddressSelected]
  );

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.inkSoft }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.bgInput, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.inkSoft}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.input, { color: colors.ink }]}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          value={value}
          onChangeText={handleTextChange}
          autoCorrect={false}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.cobalt}
            style={styles.loader}
          />
        )}
      </View>

      {suggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.border,
              shadowColor: colors.ink,
            },
          ]}
        >
          {suggestions.slice(0, 5).map((suggestion, idx) => (
            <TouchableOpacity
              key={suggestion.place_id || idx}
              style={[
                styles.suggestionItem,
                idx < Math.min(suggestions.length, 5) - 1 &&
                  styles.suggestionBorder,
                idx < Math.min(suggestions.length, 5) - 1 && {
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => handleSelect(suggestion)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.cobalt}
                style={styles.suggestionIcon}
              />
              <View style={styles.suggestionTextContainer}>
                <Text
                  style={[styles.suggestionMain, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  {suggestion.structured_formatting?.main_text ||
                    suggestion.description}
                </Text>
                <Text
                  style={[
                    styles.suggestionSecondary,
                    { color: colors.inkSoft },
                  ]}
                  numberOfLines={1}
                >
                  {suggestion.structured_formatting?.secondary_text || ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={[styles.poweredBy, { color: colors.inkFaint }]}>
            powered by Google
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    padding: 0,
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMain: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionSecondary: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  poweredBy: {
    fontFamily: fonts.body,
    fontSize: 10,
    textAlign: 'right',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
