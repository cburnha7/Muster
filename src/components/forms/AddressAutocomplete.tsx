import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

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

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);
      if (text.length >= 3 && apiKey) {
        setLoading(true);
        fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&key=${apiKey}`
        )
          .then(r => r.json())
          .then(data => setSuggestions(data.predictions || []))
          .catch(() => setSuggestions([]))
          .finally(() => setLoading(false));
      } else {
        setSuggestions([]);
      }
    },
    [apiKey, onChangeText]
  );

  const handleSelect = useCallback(
    (suggestion: any) => {
      onChangeText(suggestion.description);
      setSuggestions([]);

      if (apiKey && suggestion.place_id) {
        fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=address_components,geometry&key=${apiKey}`
        )
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
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.inkSoft}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
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
        <View style={styles.suggestionsContainer}>
          {suggestions.slice(0, 5).map((suggestion, idx) => (
            <TouchableOpacity
              key={suggestion.place_id || idx}
              style={[
                styles.suggestionItem,
                idx < Math.min(suggestions.length, 5) - 1 &&
                  styles.suggestionBorder,
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
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {suggestion.structured_formatting?.main_text ||
                    suggestion.description}
                </Text>
                <Text style={styles.suggestionSecondary} numberOfLines={1}>
                  {suggestion.structured_formatting?.secondary_text || ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={styles.poweredBy}>powered by Google</Text>
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
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.ink,
    padding: 0,
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: colors.black,
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
    borderBottomColor: colors.border,
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
    color: colors.ink,
  },
  suggestionSecondary: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
  poweredBy: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: 'right',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
