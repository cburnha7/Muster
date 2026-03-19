import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth/AuthService';
import { colors } from '../../theme';

interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

const TEST_USERS: TestUser[] = [
  {
    id: 'a6e3e977-0cea-4374-9008-047de0b0618c',
    email: 'player@muster.app',
    firstName: 'Player',
    lastName: 'Account',
    displayName: 'Player',
  },
  {
    id: 'd85bc42c-2368-4337-a486-8d88ff31ccfb',
    email: 'host@muster.app',
    firstName: 'Host',
    lastName: 'Account',
    displayName: 'Host',
  },
  {
    id: 'cec0c431-d1d9-4b6f-a284-d75c71ad6f24',
    email: 'owner@muster.app',
    firstName: 'Owner',
    lastName: 'Account',
    displayName: 'Owner',
  },
  {
    id: '46fec81e-8485-4394-8982-6c466ee30b5d',
    email: 'playerplus@muster.app',
    firstName: 'Player+',
    lastName: 'Account',
    displayName: 'Player+',
  },
];

export function UserSwitcher() {
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<TestUser>(TEST_USERS[1]); // Default to Host

  const handleSwitchUser = async (user: TestUser) => {
    setCurrentUser(user);
    setShowModal(false);
    
    // Update the auth service with new user
    await authService.switchMockUser(user.id, user.email, user.firstName, user.lastName);
    
    // Force reload the app
    window.location.reload();
  };

  // Only show in development
  if (process.env.EXPO_PUBLIC_USE_MOCK_AUTH !== 'true') {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="people" size={24} color="#FFFFFF" />
        <Text style={styles.buttonText}>{currentUser.displayName}</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch Test User</Text>
            
            {TEST_USERS.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userOption,
                  currentUser.id === user.id && styles.userOptionActive,
                ]}
                onPress={() => handleSwitchUser(user)}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.displayName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                {currentUser.id === user.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.pine} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.pine,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F7F4EE',
  },
  userOptionActive: {
    backgroundColor: colors.pine + '15',
    borderWidth: 2,
    borderColor: colors.pine,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
