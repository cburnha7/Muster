import React from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SportIconGrid } from '../../../components/wizard/SportIconGrid';
import { useCreateFacility } from './CreateFacilityContext';
import { SportType } from '../../../types';
import { fonts, useTheme } from '../../../theme';

export function Step1NameSports() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateFacility();

  const toggleSport = (sport: string) => {
    const current = state.sportTypes;
    const typed = sport as SportType;
    const next = current.includes(typed)
      ? current.filter(s => s !== typed)
      : [...current, typed];
    dispatch({ type: 'SET_FIELD', field: 'sportTypes', value: next });
  };

  const handlePickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.9,
    });
    if (result.canceled) return;
    const photos = result.assets.map(a => ({
      uri: a.uri,
      name: a.fileName || 'photo.jpg',
      type: a.mimeType || 'image/jpeg',
    }));
    dispatch({ type: 'SET_PENDING_PHOTOS', photos });
  };

  const handlePickMap = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    dispatch({
      type: 'SET_PENDING_MAP',
      file: {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'image/jpeg',
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>Name your ground</Text>

      <TextInput
        style={[styles.textInput, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.white }]}
        value={state.name}
        onChangeText={v =>
          dispatch({ type: 'SET_FIELD', field: 'name', value: v })
        }
        placeholder="Ground name"
        placeholderTextColor={colors.inkSoft}
      />

      <Text style={[styles.fieldLabel, { color: colors.inkSoft }]}>Sport types</Text>
      <SportIconGrid
        selected={state.sportTypes}
        onSelect={toggleSport}
        multiSelect
      />

      {/* Optional photos picker */}
      <Text style={[styles.fieldLabel, { color: colors.inkSoft }, { marginTop: 20 }]}>
        Photos (optional)
      </Text>
      <TouchableOpacity
        style={[styles.pickerBtn, { borderColor: colors.cobalt }]}
        onPress={handlePickPhotos}
        activeOpacity={0.7}
      >
        <Ionicons name="images-outline" size={18} color={colors.cobalt} />
        <Text style={[styles.pickerBtnText, { color: colors.cobalt }]}>
          {state.pendingPhotos.length > 0
            ? `${state.pendingPhotos.length} photo${state.pendingPhotos.length > 1 ? 's' : ''} selected`
            : 'Add photos'}
        </Text>
      </TouchableOpacity>

      {/* Optional map picker */}
      <Text style={[styles.fieldLabel, { color: colors.inkSoft }, { marginTop: 16 }]}>
        Facility map (optional)
      </Text>
      <TouchableOpacity
        style={[styles.pickerBtn, { borderColor: colors.cobalt }]}
        onPress={handlePickMap}
        activeOpacity={0.7}
      >
        <Ionicons name="map-outline" size={18} color={colors.cobalt} />
        <Text style={[styles.pickerBtnText, { color: colors.cobalt }]}>
          {state.pendingMapFile
            ? state.pendingMapFile.name
            : 'Add map (JPEG, PNG, or PDF)'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerBtnText: {
    fontFamily: fonts.body,
    fontSize: 15,
    flex: 1,
  },
});
