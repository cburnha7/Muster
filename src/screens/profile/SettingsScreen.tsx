import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { PurchaseHistorySection } from '../../components/profile/PurchaseHistorySection';
import { UserConnectSection } from '../../components/profile/UserConnectSection';
import { ConnectAccountsSection } from '../../components/profile/ConnectAccountsSection';
import { InsuranceDocumentsSection } from '../../components/profile/InsuranceDocumentsSection';
import { InsuranceDocumentForm } from '../../components/profile/InsuranceDocumentForm';
import { userService } from '../../services/api/UserService';
import { loggingService } from '../../services/LoggingService';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';
import { selectDependents } from '../../store/slices/contextSlice';
import { colors, fonts } from '../../theme';

export function SettingsScreen(): JSX.Element {
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const { isDependent } = useDependentContext();
  const dependents = useSelector(selectDependents);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [showDependantsModal, setShowDependantsModal] = useState(false);
  const [selectedDep, setSelectedDep] = useState<any>(null);

  const handleExportData = async () => {
    Alert.alert('Export Data', 'Your data will be prepared for download.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Export', onPress: async () => {
        try { await userService.exportUserData(); Alert.alert('Success', 'Check your email for the download link.'); }
        catch (err: any) { Alert.alert('Error', err.message || 'Failed to export data'); }
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    loggingService.logButton('Delete Account', 'SettingsScreen');
    Alert.alert('Delete Account', 'This action cannot be undone. All your data will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { setDeleting(true); await userService.deleteAccount(''); Alert.alert('Account Deleted', 'Your account has been deleted.', [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]); }
        catch (err: any) { Alert.alert('Error', err.message || 'Failed to delete account'); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => navigation.navigate('Login' as never) },
    ]);
  };

  const handleDeleteDependant = (dep: any) => {
    Alert.alert('Remove Dependant', `Remove ${dep.firstName} from your account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setSelectedDep(null); /* TODO: call API */ } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Purchase History, Payment, Stripe, Insurance — TOP */}
      {authUser?.id && <PurchaseHistorySection userId={authUser.id} />}
      {!isDependent && authUser?.id && <UserConnectSection userId={authUser.id} />}
      {!isDependent && authUser?.id && <ConnectAccountsSection userId={authUser.id} />}
      {!isDependent && authUser?.id && (authUser.membershipTier === 'host' || authUser.membershipTier === 'facility' || authUser.trialTier === 'host') && (
        <InsuranceDocumentsSection userId={authUser.id} onAddDocument={() => setShowInsuranceForm(true)} />
      )}
      {!isDependent && showInsuranceForm && authUser?.id && (
        <InsuranceDocumentForm userId={authUser.id} onClose={() => setShowInsuranceForm(false)} />
      )}

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: '#D1D5DB', true: colors.cobaltLight }} thumbColor={darkMode ? colors.cobalt : '#F3F4F6'} />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Location Services</Text>
          <Switch value={locationServices} onValueChange={setLocationServices} trackColor={{ false: '#D1D5DB', true: colors.cobaltLight }} thumbColor={locationServices ? colors.cobalt : '#F3F4F6'} />
        </View>
      </View>

      {/* Account (includes Privacy items) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Privacy Policy</Text><Ionicons name="chevron-forward" size={18} color={colors.inkFaint} /></TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Terms of Service</Text><Ionicons name="chevron-forward" size={18} color={colors.inkFaint} /></TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleExportData}><Text style={styles.menuItemText}>Export My Data</Text><Ionicons name="chevron-forward" size={18} color={colors.inkFaint} /></TouchableOpacity>
        {!isDependent && (
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowDependantsModal(true)}>
            <Text style={styles.menuItemText}>Manage Dependants</Text><Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}><Text style={[styles.menuItemText, { color: colors.gold }]}>Logout</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount} disabled={deleting}>
          <Text style={[styles.menuItemText, { color: colors.heart }]}>{deleting ? 'Deleting...' : 'Delete Account'}</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingItem}><Text style={styles.settingLabel}>Version</Text><Text style={styles.infoValue}>1.0.0</Text></View>
        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Help & Support</Text><Ionicons name="chevron-forward" size={18} color={colors.inkFaint} /></TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}><Text style={styles.menuItemText}>Rate the App</Text><Ionicons name="chevron-forward" size={18} color={colors.inkFaint} /></TouchableOpacity>
      </View>

      {/* Manage Dependants Modal */}
      <Modal visible={showDependantsModal} transparent animationType="fade" onRequestClose={() => setShowDependantsModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => { setShowDependantsModal(false); setSelectedDep(null); }}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Dependants</Text>
              <TouchableOpacity onPress={() => { setShowDependantsModal(false); setSelectedDep(null); }}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {dependents.length === 0 ? (
                <Text style={styles.emptyText}>No dependants added yet.</Text>
              ) : (
                dependents.map((dep) => (
                  <View key={dep.id}>
                    <TouchableOpacity style={styles.depRow} onPress={() => setSelectedDep(selectedDep?.id === dep.id ? null : dep)} activeOpacity={0.7}>
                      <View style={styles.depAvatar}>
                        <Text style={styles.depAvatarText}>{dep.firstName?.[0]?.toUpperCase() || '?'}</Text>
                      </View>
                      <Text style={styles.depName}>{dep.firstName} {(dep as any).lastName || ''}</Text>
                      <Ionicons name={selectedDep?.id === dep.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkFaint} />
                    </TouchableOpacity>
                    {selectedDep?.id === dep.id && (
                      <View style={styles.depActions}>
                        <TouchableOpacity style={styles.depActionBtn} onPress={() => { setShowDependantsModal(false); setSelectedDep(null); (navigation as any).navigate('DependentProfile', { dependentId: dep.id }); }}>
                          <Ionicons name="create-outline" size={16} color={colors.cobalt} />
                          <Text style={[styles.depActionText, { color: colors.cobalt }]}>Manage</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.depActionBtn} onPress={() => handleDeleteDependant(dep)}>
                          <Ionicons name="trash-outline" size={16} color={colors.heart} />
                          <Text style={[styles.depActionText, { color: colors.heart }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            {/* Add Dependant */}
            <TouchableOpacity style={styles.addDepBtn} onPress={() => { setShowDependantsModal(false); (navigation as any).navigate('DependentForm', {}); }}>
              <Ionicons name="add-circle-outline" size={20} color={colors.cobalt} />
              <Text style={styles.addDepText}>Add Dependant</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink, marginBottom: 12 },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  infoValue: { fontFamily: fonts.body, fontSize: 16, color: colors.inkFaint },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 70 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, maxHeight: '80%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink },
  modalScroll: { paddingHorizontal: 16, paddingVertical: 8 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.inkFaint, textAlign: 'center', paddingVertical: 20 },
  depRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  depAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cobalt, alignItems: 'center', justifyContent: 'center' },
  depAvatarText: { fontFamily: fonts.ui, fontSize: 16, color: '#FFFFFF' },
  depName: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  depActions: { flexDirection: 'row', gap: 12, paddingVertical: 8, paddingLeft: 46 },
  depActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surface },
  depActionText: { fontFamily: fonts.ui, fontSize: 13 },
  addDepBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  addDepText: { fontFamily: fonts.ui, fontSize: 15, color: colors.cobalt },
});
