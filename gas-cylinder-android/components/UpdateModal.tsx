import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { UpdateInfo } from '../hooks/useAppUpdate';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onUpdate: () => void;
  onDismiss?: () => void;
}

export default function UpdateModal({ visible, updateInfo, onUpdate, onDismiss }: UpdateModalProps) {
  if (!updateInfo || !updateInfo.hasUpdate) {
    return null;
  }

  const isRequired = updateInfo.isRequired;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isRequired ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isRequired ? '🔔 Update Required' : '✨ Update Available'}
            </Text>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.versionText}>
              Version {updateInfo.latestVersion} is now available
            </Text>
            <Text style={styles.currentVersionText}>
              Your current version: {updateInfo.currentVersion}
            </Text>
            
            {updateInfo.releaseNotes && (
              <View style={styles.releaseNotesContainer}>
                <Text style={styles.releaseNotesTitle}>What's New:</Text>
                <Text style={styles.releaseNotes}>{updateInfo.releaseNotes}</Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            {!isRequired && onDismiss && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onDismiss}
              >
                <Text style={styles.cancelButtonText}>Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={onUpdate}
            >
              <Text style={styles.updateButtonText}>
                {Platform.OS === 'ios' ? 'Update on App Store' : 'Update on Play Store'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    maxHeight: 300,
  },
  versionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#40B5AD',
    marginBottom: 8,
    textAlign: 'center',
  },
  currentVersionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  releaseNotesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  releaseNotes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#40B5AD',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

