import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function EnhancedScannerTestScreen() {
  const navigation = useNavigation();

  const TestOption = ({ title, description, icon, screen, color = '#007AFF' }) => (
    <TouchableOpacity
      style={[styles.testOption, { borderLeftColor: color }]}
      onPress={() => navigation.navigate(screen)}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <View style={styles.testInfo}>
        <Text style={styles.testTitle}>{title}</Text>
        <Text style={styles.testDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Scanner Tests</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            Test the new enterprise-grade scanner features. Each test demonstrates different capabilities.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Scanning Modes</Text>

        <TestOption
          title="Single Scan Test"
          description="Test basic single barcode scanning"
          icon="barcode-outline"
          screen="TestSingleScan"
          color="#4CAF50"
        />

        <TestOption
          title="Batch Scan Test"
          description="Rapid sequential scanning (2-5 scans/sec)"
          icon="albums-outline"
          screen="TestBatchScan"
          color="#2196F3"
        />

        <TestOption
          title="Concurrent Scan Test"
          description="Detect multiple barcodes simultaneously"
          icon="grid-outline"
          screen="TestConcurrentScan"
          color="#FF9800"
        />

        <Text style={styles.sectionTitle}>Advanced Features</Text>

        <TestOption
          title="Image Processing Test"
          description="Test low-light, enhancement, damage recovery"
          icon="image-outline"
          screen="TestImageProcessing"
          color="#9C27B0"
        />

        <TestOption
          title="Performance Monitor"
          description="View real-time scanning performance metrics"
          icon="speedometer-outline"
          screen="TestPerformance"
          color="#F44336"
        />

        <TestOption
          title="Scanner Settings"
          description="Configure scanner options and presets"
          icon="settings-outline"
          screen="TestScannerSettings"
          color="#607D8B"
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Tip: Test in different lighting conditions and with various barcode types
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  testOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
    textAlign: 'center',
  },
});
