import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../../../components/forms/FormInput';
import { HoursOfOperationSection } from '../../../components/facilities/HoursOfOperationSection';
import { useCreateFacility } from './CreateFacilityContext';
import { CourtFormData } from './types';
import { fonts, Spacing, useTheme } from '../../../theme';
import { formatSportType } from '../../../utils/formatters';

const EMPTY_COURT: CourtFormData = {
  id: '',
  name: '',
  sportType: '',
  capacity: 10,
  isIndoor: false,
  pricePerHour: 0,
};

export function Step4Courts() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateFacility();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CourtFormData>(EMPTY_COURT);

  const openAdd = () => {
    setDraft(EMPTY_COURT);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (court: CourtFormData) => {
    setDraft(court);
    setEditingId(court.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setDraft(EMPTY_COURT);
  };

  const handleSave = () => {
    if (!draft.name.trim() || !draft.sportType) return;
    if (editingId) {
      dispatch({ type: 'UPDATE_COURT', court: draft });
    } else {
      dispatch({
        type: 'ADD_COURT',
        court: { ...draft, id: Date.now().toString() },
      });
    }
    closeModal();
  };

  // Only show sports selected on Step 1
  const availableSports = state.sportTypes;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>Courts and settings</Text>

      {/* Courts section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Courts / Fields</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAdd}>
            <Ionicons
              name="add-circle"
              size={24}
              color={colors.cobalt}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.addButtonText, { color: colors.cobalt }]}>Add Court</Text>
          </TouchableOpacity>
        </View>

        {state.courts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.inkSoft }]}>
            No courts added yet. Add courts to set individual pricing.
          </Text>
        ) : (
          state.courts.map(court => (
            <View key={court.id} style={[styles.courtCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <View style={styles.courtInfo}>
                <Text style={[styles.courtName, { color: colors.ink }]}>{court.name}</Text>
                <Text style={[styles.courtDetails, { color: colors.inkSoft }]}>
                  {court.sportType.charAt(0).toUpperCase() +
                    court.sportType.slice(1)}{' '}
                  • {court.isIndoor ? 'Indoor' : 'Outdoor'} • Capacity:{' '}
                  {court.capacity}
                </Text>
                <Text style={[styles.courtPrice, { color: colors.cobalt }]}>
                  ${court.pricePerHour}/hour
                </Text>
              </View>
              <View style={styles.courtActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() =>
                    dispatch({ type: 'REMOVE_COURT', courtId: court.id })
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.heart}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(court)}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={20}
                    color={colors.cobalt}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Hours of Operation */}
      <HoursOfOperationSection
        hours={state.hoursOfOperation}
        onChange={hours => dispatch({ type: 'SET_HOURS', hours })}
      />

      <View style={{ height: 40 }} />

      {/* Add / Edit Court Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                {editingId ? 'Edit Court/Field' : 'Add Court/Field'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <FormInput
                label="Court Name *"
                value={draft.name}
                onChangeText={v => setDraft({ ...draft, name: v })}
                placeholder="e.g., Court 1, Field A"
              />

              <Text style={[styles.inputLabel, { color: colors.ink }]}>Sport Type *</Text>
              <View style={styles.sportChipRow}>
                {availableSports.map(sport => {
                  const isSelected = draft.sportType === sport;
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[
                        styles.sportChip, { backgroundColor: colors.white, borderColor: colors.border },
                        isSelected && styles.sportChipSelected, isSelected && { backgroundColor: colors.cobalt, borderColor: colors.cobalt }]}
                      onPress={() => setDraft({ ...draft, sportType: sport })}
                    >
                      <Text
                        style={[
                          styles.sportChipText, { color: colors.inkSoft },
                          isSelected && styles.sportChipTextSelected, isSelected && { color: colors.white }]}
                      >
                        {formatSportType(sport)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormInput
                label="Capacity"
                value={draft.capacity.toString()}
                onChangeText={v =>
                  setDraft({ ...draft, capacity: parseInt(v) || 0 })
                }
                placeholder="10"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() =>
                  setDraft({ ...draft, isIndoor: !draft.isIndoor })
                }
              >
                <View
                  style={[
                    styles.checkbox, { borderColor: colors.inkSoft },
                    draft.isIndoor && styles.checkboxChecked, draft.isIndoor && { backgroundColor: colors.cobalt, borderColor: colors.cobalt }]}
                >
                  {draft.isIndoor && (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.ink }]}>Indoor Court</Text>
              </TouchableOpacity>

              <FormInput
                label="Price Per Hour ($)"
                value={draft.pricePerHour.toString()}
                onChangeText={v =>
                  setDraft({ ...draft, pricePerHour: parseFloat(v) || 0 })
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: colors.surface }]}
                onPress={closeModal}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.inkSoft }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.cobalt }]}
                onPress={handleSave}
              >
                <Text style={[styles.modalBtnPrimaryText, { color: colors.white }]}>
                  {editingId ? 'Update Court' : 'Add Court'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
  },
  addButton: { flexDirection: 'row', alignItems: 'center' },
  addButtonText: { fontFamily: fonts.ui, fontSize: 14 },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  courtInfo: { flex: 1 },
  courtName: {
    fontFamily: fonts.label,
    fontSize: 15,
    marginBottom: 2,
  },
  courtDetails: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 2,
  },
  courtPrice: { fontFamily: fonts.label, fontSize: 14 },
  courtActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: 18 },
  modalBody: { padding: Spacing.lg },
  inputLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sportChipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  sportChipSelected: {},
  sportChipText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  sportChipTextSelected: { fontFamily: fonts.ui },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {},
  checkboxLabel: { fontFamily: fonts.body, fontSize: 14 },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalBtnCancel: {},
  modalBtnCancelText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  modalBtnPrimary: {},
  modalBtnPrimaryText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});
