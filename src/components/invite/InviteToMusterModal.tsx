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
import { colors, fonts } from '../../theme';

interface InviteToMusterModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (name: string, email: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteToMusterModal({ visible, onClose, onInvite }: InviteToMusterModalProps) {
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
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Invite to Muster</Text>
            <Text style={styles.subtitle}>Invite someone who isn't on Muster yet</Text>

            <Text style={styles.inputLabel}>Player Name</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : undefined]}
              placeholder="Full name"
              placeholderTextColor={colors.inkSoft}
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
            />
            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : undefined]}
              placeholder="email@example.com"
              placeholderTextColor={colors.inkSoft}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

            <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.8}>
              <Text style={styles.inviteBtnText}>Invite</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.ink,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },
  inputError: {
    borderColor: colors.heart,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.heart,
    marginTop: -8,
    marginBottom: 8,
  },
  inviteBtn: {
    backgroundColor: colors.cobalt,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  inviteBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.white,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
});
