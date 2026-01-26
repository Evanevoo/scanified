import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PerformanceMonitor } from '../../shared/scanners/PerformanceMonitor';

export default function TestPerformanceScreen() {
  const navigation = useNavigation();
  const [monitor] = useState(() => new PerformanceMonitor(15));
  const [stats, setStats] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [optimized, setOptimized] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const simulateScans = () => {
    setRunning(true);
    
    // Simulate 50 scans with varying performance
    for (let i = 0; i < 50; i++) {
      const scanTime = Math.random() * 200 + 50; // 50-250ms
      const processingTime = Math.random() * 150 + 50; // 50-200ms
      const lookupTime = Math.random() * 100 + 20; // 20-120ms
      
      monitor.recordScanTime(scanTime);
      monitor.recordProcessingTime(processingTime);
      monitor.recordLookupTime(lookupTime);
      monitor.recordFrame();
    }
    
    updateMetrics();
    setRunning(false);
  };

  const updateMetrics = () => {
    const currentStats = monitor.getStats();
    const currentGrade = monitor.getPerformanceGrade();
    const currentIssues = monitor.detectBottlenecks();
    const currentOptimized = monitor.autoTune();
    
    setStats(currentStats);
    setGrade(currentGrade);
    setIssues(currentIssues);
    setOptimized(currentOptimized);
    
    console.log('📊 Performance Stats:', currentStats);
    console.log('🎓 Grade:', currentGrade);
    console.log('⚠️ Issues:', currentIssues);
    console.log('⚙️ Optimizations:', currentOptimized);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#4CAF50';
      case 'B': return '#8BC34A';
      case 'C': return '#FFC107';
      case 'D': return '#FF9800';
      case 'F': return '#F44336';
      default: return '#999';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#FFC107';
      default: return '#999';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance Monitor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Simulate Performance Test</Text>
          <Text style={styles.cardDescription}>
            Run a simulation of 50 scans to analyze performance and get optimization recommendations.
          </Text>
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={simulateScans}
            disabled={running}
          >
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.simulateButtonText}>
              {running ? 'Running...' : 'Run Simulation'}
            </Text>
          </TouchableOpacity>
        </View>

        {grade && (
          <View style={[styles.card, { backgroundColor: getGradeColor(grade.grade) + '10' }]}>
            <View style={styles.gradeContainer}>
              <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(grade.grade) }]}>
                <Text style={styles.gradeText}>{grade.grade}</Text>
              </View>
              <View style={styles.gradeInfo}>
                <Text style={styles.gradeTitle}>Performance Grade</Text>
                <Text style={styles.gradeScore}>{grade.score} / 100</Text>
              </View>
            </View>
          </View>
        )}

        {stats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Performance Metrics</Text>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Avg Scan Time</Text>
              <Text style={styles.metricValue}>{stats.avgScanTime.toFixed(2)} ms</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Avg Processing Time</Text>
              <Text style={styles.metricValue}>{stats.avgProcessingTime.toFixed(2)} ms</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Avg Lookup Time</Text>
              <Text style={styles.metricValue}>{stats.avgLookupTime.toFixed(2)} ms</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Time</Text>
              <Text style={styles.metricValue}>{stats.avgTotalTime.toFixed(2)} ms</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Scans per Second</Text>
              <Text style={[styles.metricValue, { color: '#4CAF50' }]}>
                {stats.scansPerSecond.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>FPS Efficiency</Text>
              <Text style={styles.metricValue}>{stats.fpsEfficiency.toFixed(1)}%</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Scans</Text>
              <Text style={styles.metricValue}>{stats.totalScans}</Text>
            </View>
          </View>
        )}

        {issues && issues.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ Performance Issues</Text>
            {issues.map((issue, index) => (
              <View key={index} style={styles.issueCard}>
                <View style={styles.issueHeader}>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) }]}>
                    <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.issueType}>{issue.type.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.issueDescription}>{issue.description}</Text>
                <View style={styles.recommendationCard}>
                  <Ionicons name="bulb" size={16} color="#FF9800" />
                  <Text style={styles.recommendationText}>{issue.recommendation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {optimized && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚙️ Auto-Tuned Settings</Text>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Target FPS</Text>
              <Text style={styles.metricValue}>{optimized.targetFPS}</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Downsample Factor</Text>
              <Text style={styles.metricValue}>{optimized.downsampleFactor}x</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Cache Size</Text>
              <Text style={styles.metricValue}>{optimized.cacheSize}</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Worker Threads</Text>
              <Text style={styles.metricValue}>{optimized.workerCount}</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Skip Similar Frames</Text>
              <Text style={styles.metricValue}>{optimized.skipSimilarFrames ? 'Yes' : 'No'}</Text>
            </View>
            
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Image Processing</Text>
              <Text style={styles.metricValue}>{optimized.enableImageProcessing ? 'Enabled' : 'Disabled'}</Text>
            </View>
            
            {optimized.recommendations && optimized.recommendations.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.recommendationsTitle}>💡 Recommendations:</Text>
                {optimized.recommendations.map((rec: string, index: number) => (
                  <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
                ))}
              </>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Performance metrics help optimize scanner settings for your device.
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
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gradeBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  gradeInfo: {
    flex: 1,
  },
  gradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gradeScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  issueCard: {
    backgroundColor: '#FFF3F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  issueType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  issueDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    gap: 8,
    alignItems: 'flex-start',
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
