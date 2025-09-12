import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { customizationService, CustomSound, LayoutOptions, AccessibilityOptions } from '../services/customizationService';
import { useTheme } from '../context/ThemeContext';

interface CustomizationScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomizationScreen({ visible, onClose }: CustomizationScreenProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'sounds' | 'layout' | 'accessibility' | 'theme'>('sounds');
  
  // State for settings
  const [sounds, setSounds] = useState<CustomSound[]>([]);
  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions | null>(null);
  const [accessibilityOptions, setAccessibilityOptions] = useState<AccessibilityOptions | null>(null);
  const [customTheme, setCustomTheme] = useState<any>(null);
  
  // State for adding new sounds
  const [showAddSoundModal, setShowAddSoundModal] = useState(false);
  const [newSoundName, setNewSoundName] = useState('');
  const [newSoundFile, setNewSoundFile] = useState('');
  const [newSoundCategory, setNewSoundCategory] = useState<'scan' | 'notification' | 'action' | 'error'>('scan');

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const settings = customizationService.getSettings();
      if (settings) {
        setSounds(settings.sounds);
        setLayoutOptions(settings.layout);
        setAccessibilityOptions(settings.accessibility);
        setCustomTheme(settings.customTheme);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSoundEnabled = async (soundId: string, enabled: boolean) => {
    try {
      await customizationService.updateCustomSound(soundId, { enabled });
      setSounds(prev => prev.map(s => s.id === soundId ? { ...s, enabled } : s));
    } catch (error) {
      console.error('Failed to update sound:', error);
    }
  };

  const addCustomSound = async () => {
    if (!newSoundName.trim() || !newSoundFile.trim()) {
      Alert.alert('Error', 'Please enter both name and file path');
      return;
    }

    try {
      const soundId = await customizationService.addCustomSound({
        name: newSoundName.trim(),
        file: newSoundFile.trim(),
        category: newSoundCategory,
        enabled: true,
      });

      setSounds(prev => [...prev, {
        id: soundId,
        name: newSoundName.trim(),
        file: newSoundFile.trim(),
        category: newSoundCategory,
        enabled: true,
      }]);

      setNewSoundName('');
      setNewSoundFile('');
      setShowAddSoundModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add custom sound');
    }
  };

  const removeCustomSound = async (soundId: string) => {
    Alert.alert(
      'Remove Sound',
      'Are you sure you want to remove this custom sound?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await customizationService.removeCustomSound(soundId);
              setSounds(prev => prev.filter(s => s.id !== soundId));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove custom sound');
            }
          },
        },
      ]
    );
  };

  const updateLayoutOption = (key: keyof LayoutOptions, value: any) => {
    if (!layoutOptions) return;

    const updated = { ...layoutOptions, [key]: value };
    setLayoutOptions(updated);
    customizationService.updateLayoutOptions({ [key]: value });
  };

  const updateAccessibilityOption = (key: keyof AccessibilityOptions, value: boolean) => {
    if (!accessibilityOptions) return;

    const updated = { ...accessibilityOptions, [key]: value };
    setAccessibilityOptions(updated);
    customizationService.updateAccessibilityOptions({ [key]: value });
  };

  const resetToDefaults = async () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all customization settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await customizationService.resetToDefaults();
              await loadSettings();
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const renderTabButton = (tab: typeof activeTab, title: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton,
        { backgroundColor: activeTab === tab ? theme.primary : theme.surface }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[
        styles.tabText,
        { color: activeTab === tab ? '#fff' : theme.text }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderSoundsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Custom Sounds</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowAddSoundModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add Sound</Text>
          </TouchableOpacity>
        </View>

        {sounds.map(sound => (
          <View key={sound.id} style={[styles.soundItem, { backgroundColor: theme.surface }]}>
            <View style={styles.soundInfo}>
              <Text style={[styles.soundName, { color: theme.text }]}>{sound.name}</Text>
              <Text style={[styles.soundCategory, { color: theme.textSecondary }]}>
                {sound.category} • {sound.file}
              </Text>
            </View>
            
            <View style={styles.soundControls}>
              <Switch
                value={sound.enabled}
                onValueChange={(enabled) => updateSoundEnabled(sound.id, enabled)}
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={sound.enabled ? '#fff' : '#f4f3f4'}
              />
              
              {sound.id.startsWith('custom_') && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeCustomSound(sound.id)}
                >
                  <Text style={styles.removeButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderLayoutTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Layout Options</Text>

        {/* Theme */}
        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>Theme</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={layoutOptions?.theme || 'auto'}
              onValueChange={(value) => updateLayoutOption('theme', value)}
              style={styles.picker}
            >
              <Picker.Item label="Light" value="light" />
              <Picker.Item label="Dark" value="dark" />
              <Picker.Item label="Auto" value="auto" />
            </Picker>
          </View>
        </View>

        {/* Font Size */}
        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>Font Size</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={layoutOptions?.fontSize || 'medium'}
              onValueChange={(value) => updateLayoutOption('fontSize', value)}
              style={styles.picker}
            >
              <Picker.Item label="Small" value="small" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="Large" value="large" />
              <Picker.Item label="Extra Large" value="extra-large" />
            </Picker>
          </View>
        </View>

        {/* Button Size */}
        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>Button Size</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={layoutOptions?.buttonSize || 'comfortable'}
              onValueChange={(value) => updateLayoutOption('buttonSize', value)}
              style={styles.picker}
            >
              <Picker.Item label="Compact" value="compact" />
              <Picker.Item label="Comfortable" value="comfortable" />
              <Picker.Item label="Large" value="large" />
            </Picker>
          </View>
        </View>

        {/* Spacing */}
        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>Spacing</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={layoutOptions?.spacing || 'normal'}
              onValueChange={(value) => updateLayoutOption('spacing', value)}
              style={styles.picker}
            >
              <Picker.Item label="Tight" value="tight" />
              <Picker.Item label="Normal" value="normal" />
              <Picker.Item label="Relaxed" value="relaxed" />
            </Picker>
          </View>
        </View>

        {/* Visual Options */}
        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>Show Animations</Text>
          <Switch
            value={layoutOptions?.showAnimations || false}
            onValueChange={(value) => updateLayoutOption('showAnimations', value)}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={layoutOptions?.showAnimations ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>Reduce Motion</Text>
          <Switch
            value={layoutOptions?.reduceMotion || false}
            onValueChange={(value) => updateLayoutOption('reduceMotion', value)}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={layoutOptions?.reduceMotion ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.optionItem}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>High Contrast</Text>
          <Switch
            value={layoutOptions?.highContrast || false}
            onValueChange={(value) => updateLayoutOption('highContrast', value)}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={layoutOptions?.highContrast ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderAccessibilityTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Accessibility Options</Text>

        {/* Screen Reader Options */}
        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: theme.text }]}>Screen Reader</Text>
          
          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Enable Screen Reader</Text>
            <Switch
              value={accessibilityOptions?.screenReader || false}
              onValueChange={(value) => updateAccessibilityOption('screenReader', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.screenReader ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Voice Over</Text>
            <Switch
              value={accessibilityOptions?.voiceOver || false}
              onValueChange={(value) => updateAccessibilityOption('voiceOver', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.voiceOver ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Visual Options */}
        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: theme.text }]}>Visual</Text>
          
          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Large Text</Text>
            <Switch
              value={accessibilityOptions?.largeText || false}
              onValueChange={(value) => updateAccessibilityOption('largeText', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.largeText ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Bold Text</Text>
            <Switch
              value={accessibilityOptions?.boldText || false}
              onValueChange={(value) => updateAccessibilityOption('boldText', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.boldText ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Button Shapes</Text>
            <Switch
              value={accessibilityOptions?.buttonShapes || false}
              onValueChange={(value) => updateAccessibilityOption('buttonShapes', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.buttonShapes ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Reduce Transparency</Text>
            <Switch
              value={accessibilityOptions?.reduceTransparency || false}
              onValueChange={(value) => updateAccessibilityOption('reduceTransparency', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.reduceTransparency ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Speech Options */}
        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: theme.text }]}>Speech</Text>
          
          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Speak Screen</Text>
            <Switch
              value={accessibilityOptions?.speakScreen || false}
              onValueChange={(value) => updateAccessibilityOption('speakScreen', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.speakScreen ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Speak Selection</Text>
            <Switch
              value={accessibilityOptions?.speakSelection || false}
              onValueChange={(value) => updateAccessibilityOption('speakSelection', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.speakSelection ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Speak Scan Results</Text>
            <Switch
              value={accessibilityOptions?.speakScanResults || false}
              onValueChange={(value) => updateAccessibilityOption('speakScanResults', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.speakScanResults ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Speak Errors</Text>
            <Switch
              value={accessibilityOptions?.speakErrors || false}
              onValueChange={(value) => updateAccessibilityOption('speakErrors', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.speakErrors ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionItem}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Speak Success</Text>
            <Switch
              value={accessibilityOptions?.speakSuccess || false}
              onValueChange={(value) => updateAccessibilityOption('speakSuccess', value)}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={accessibilityOptions?.speakSuccess ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderThemeTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Custom Theme</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Customize colors to match your brand or preferences
        </Text>

        {/* Theme color inputs would go here */}
        <View style={styles.themePreview}>
          <Text style={[styles.themePreviewText, { color: theme.text }]}>
            Theme customization coming soon...
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>Customization</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
          {renderTabButton('sounds', 'Sounds', '🔊')}
          {renderTabButton('layout', 'Layout', '📐')}
          {renderTabButton('accessibility', 'Accessibility', '♿')}
          {renderTabButton('theme', 'Theme', '🎨')}
        </View>

        {/* Tab Content */}
        {activeTab === 'sounds' && renderSoundsTab()}
        {activeTab === 'layout' && renderLayoutTab()}
        {activeTab === 'accessibility' && renderAccessibilityTab()}
        {activeTab === 'theme' && renderThemeTab()}

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: theme.error }]}
            onPress={resetToDefaults}
          >
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Add Sound Modal */}
        <Modal visible={showAddSoundModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Custom Sound</Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Sound name"
                value={newSoundName}
                onChangeText={setNewSoundName}
                placeholderTextColor={theme.textSecondary}
              />
              
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="File path (e.g., custom_sound.mp3)"
                value={newSoundFile}
                onChangeText={setNewSoundFile}
                placeholderTextColor={theme.textSecondary}
              />
              
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newSoundCategory}
                  onValueChange={(value) => setNewSoundCategory(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Scan" value="scan" />
                  <Picker.Item label="Notification" value="notification" />
                  <Picker.Item label="Action" value="action" />
                  <Picker.Item label="Error" value="error" />
                </Picker>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddSoundModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={addCustomSound}
                >
                  <Text style={styles.addButtonText}>Add Sound</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  subsection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  soundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  soundCategory: {
    fontSize: 12,
  },
  soundControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  pickerContainer: {
    flex: 1,
    maxWidth: 150,
  },
  picker: {
    height: 50,
  },
  themePreview: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  themePreviewText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
