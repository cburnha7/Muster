import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { fonts, useTheme } from '../../theme';

interface InviteToMusterModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (name: string, email: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteToMusterModal({ visible, onClose, onInvite }: InviteToMusterModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setNameError('');
    setEmailError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInvite = () => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else {
      setNameError('');
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!valid) return;

    onInvite(name.trim(), email.trim());
    resetForm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredView}
        >
          <Pressable style={[styles.card, { backgroundColor: colors.white }]} onPress={() => {}}>
            <Text style={[styles.title, { color: colors.ink }]}>Invite to Muster</Text>
            <Text style={[styles.subtitle, { color: colors.inkSoft }]}>Invite someone who isn't on Muster yet</Text>

            <Text style={[styles.inputLabel, { color: colors.ink }]}>Player Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.ink }, nameError ? styles.inputError : undefined, nameError ? { borderColor: colors.heart } : {}]}
              placeholder="Full name"
              placeholderTextColor={colors.inkSoft}
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
            />
            {!!nameError && <Text style={[styles.errorText, { color: colors.heart }]}>{nameError}</Text>}

            <Text style={[styles.inputLabel, { color: colors.ink }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.ink }, emailError ? styles.inputError : undefined, emailError ? { borderColor: colors.heart } : {}]}
              placeholder="email@example.com"
              placeholderTextColor={colors.inkSoft}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
            />
            {!!emailError && <Text style={[styles.errorText, { color: colors.heart }]}>{emailError}</Text>}

            <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.cobalt }]} onPress={handleInvite} activeOpacity={0.8}>
              <Text style={[styles.inviteBtnText, { color: colors.white }]}>Invite</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.inkSoft }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 12,
  },
  inputError: {},
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  inviteBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  inviteBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
