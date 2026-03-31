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
import { colors, fonts, Spacing } from '../../../theme';

const EMPTY_COURT: CourtFormData = {
  id: '',
  name: '',
  sportType: '',
  capacity: 10,
  isIndoor: false,
  pricePerHour: 0,
};

export function Step4Courts() {
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
      dispatch({ type: 'ADD_COURT', court: { ...draft, id: Date.now().toString() } });
    }
    closeModal();
  };

  // Only show sports selected on Step 1
  const availableSports = state.sportTypes;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Courts and settings</Text>

      {/* Courts section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Courts / Fields</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAdd}>
            <Ionicons name="add-circle" size={24} color={colors.cobalt} style={{ marginRight: 4 }} />
            <Text style={styles.addButtonText}>Add Court</Text>
          </TouchableOpacity>
        </View>

        {state.courts.length === 0 ? (
          <Text style={styles.emptyText}>
            No courts added yet. Add courts to set individual pricing.
          </Text>
        ) : (
          state.courts.map((court) => (
            <View key={court.id} style={styles.courtCard}>
              <View style={styles.courtInfo}>
                <Text style={styles.courtName}>{court.name}</Text>
                <Text style={styles.courtDetails}>
                  {court.sportType.charAt(0).toUpperCase() + court.sportType.slice(1)} •{' '}
                  {court.isIndoor ? 'Indoor' : 'Outdoor'} • Capacity: {court.capacity}
                </Text>
                <Text style={styles.courtPrice}>${court.pricePerHour}/hour</Text>
              </View>
              <View style={styles.courtActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => dispatch({ type: 'REMOVE_COURT', courtId: court.id })}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.heart} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(court)}
                >
                  <Ionicons name="pencil-outline" size={20} color={colors.cobalt} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Hours of Operation */}
      <HoursOfOperationSection
        hours={state.hoursOfOperation}
        onChange={(hours) => dispatch({ type: 'SET_HOURS', hours })}
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
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
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
                onChangeText={(v) => setDraft({ ...draft, name: v })}
                placeholder="e.g., Court 1, Field A"
              />

              <Text style={styles.inputLabel}>Sport Type *</Text>
              <View style={styles.sportChipRow}>
                {availableSports.map((sport) => {
                  const isSelected = draft.sportType === sport;
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                      onPress={() => setDraft({ ...draft, sportType: sport })}
                    >
                      <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormInput
                label="Capacity"
                value={draft.capacity.toString()}
                onChangeText={(v) => setDraft({ ...draft, capacity: parseInt(v) || 0 })}
                placeholder="10"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDraft({ ...draft, isIndoor: !draft.isIndoor })}
              >
                <View style={[styles.checkbox, draft.isIndoor && styles.checkboxChecked]}>
                  {draft.isIndoor && (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Indoor Court</Text>
              </TouchableOpacity>

              <FormInput
                label="Price Per Hour ($)"
                value={draft.pricePerHour.toString()}
                onChangeText={(v) => setDraft({ ...draft, pricePerHour: parseFloat(v) || 0 })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={closeModal}
              >
                <Text style={styles.modalBtnCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleSave}
              >
                <Text style={styles.modalBtnPrimaryText}>
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
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
  section: {
    backgroundColor: colors.surface,
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
    color: colors.ink,
  },
  addButton: { flexDirection: 'row', alignItems: 'center' },
  addButtonText: { fontFamily: fonts.ui, fontSize: 14, color: colors.cobalt },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingVertical: 16,
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courtInfo: { flex: 1 },
  courtName: { fontFamily: fonts.label, fontSize: 15, color: colors.ink, marginBottom: 2 },
  courtDetails: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginBottom: 2 },
  courtPrice: { fontFamily: fonts.label, fontSize: 14, color: colors.cobalt },
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
    backgroundColor: colors.white,
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
    borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
  modalBody: { padding: Spacing.lg },
  inputLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sportChipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.white,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportChipSelected: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  sportChipText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  sportChipTextSelected: { color: colors.white, fontFamily: fonts.ui },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.inkSoft,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  checkboxLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalBtnCancel: { backgroundColor: colors.surface },
  modalBtnCancelText: { fontFamily: fonts.ui, fontSize: 14, color: colors.inkSoft },
  modalBtnPrimary: { backgroundColor: colors.cobalt },
  modalBtnPrimaryText: { fontFamily: fonts.ui, fontSize: 14, color: colors.white },
});
