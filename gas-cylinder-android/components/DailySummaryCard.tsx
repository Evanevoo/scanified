import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { statsService, DailyStats, WeeklyStats, Achievement } from '../services/statsService';
import { formatDateLocal } from '../utils/dateUtils';
import { feedbackService } from '../services/feedbackService';

const { width } = Dimensions.get('window');

interface DailySummaryCardProps {
  onPress?: () => void;
}

export default function DailySummaryCard({ onPress }: DailySummaryCardProps) {
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      await statsService.initialize();
      
      const [today, weekly, achievements, insightsList] = await Promise.all([
        statsService.getTodayStats(),
        statsService.getWeeklyStats(),
        Promise.resolve(statsService.getRecentAchievements(3)),
        statsService.getInsights(),
      ]);

      setTodayStats(today);
      setWeeklyStats(weekly);
      setRecentAchievements(achievements);
      setInsights(insightsList);
    } catch (error) {
      logger.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = async () => {
    await feedbackService.quickAction('daily summary opened');
    setShowDetailModal(true);
    if (onPress) onPress();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#6B7280';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getProductivityLevel = (scansCount: number) => {
    if (scansCount >= 100) return { level: 'Legendary', color: '#F59E0B', icon: '⚡' };
    if (scansCount >= 50) return { level: 'High', color: '#10B981', icon: '🚀' };
    if (scansCount >= 20) return { level: 'Good', color: '#3B82F6', icon: '📈' };
    if (scansCount >= 10) return { level: 'Active', color: '#8B5CF6', icon: '🎯' };
    return { level: 'Getting Started', color: '#6B7280', icon: '🌱' };
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>📊 Loading your daily summary...</Text>
        </View>
      </View>
    );
  }

  if (!todayStats) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Unable to load daily summary</Text>
      </View>
    );
  }

  const productivity = getProductivityLevel(todayStats.scansCount);

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.8}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>📊 Daily Summary</Text>
            <Text style={styles.date}>{formatDateLocal(new Date().toISOString())}</Text>
          </View>
          <View style={[styles.productivityBadge, { backgroundColor: productivity.color + '20' }]}>
            <Text style={[styles.productivityIcon, { color: productivity.color }]}>
              {productivity.icon}
            </Text>
            <Text style={[styles.productivityText, { color: productivity.color }]}>
              {productivity.level}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayStats.scansCount}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayStats.batchesCount}</Text>
            <Text style={styles.statLabel}>Batches</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayStats.customersScanned.length}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayStats.locationsVisited.length}</Text>
            <Text style={styles.statLabel}>Locations</Text>
          </View>
        </View>

        {recentAchievements.length > 0 && (
          <View style={styles.achievementsContainer}>
            <Text style={styles.achievementsTitle}>🏆 Recent Achievements</Text>
            <View style={styles.achievementsList}>
              {recentAchievements.slice(0, 2).map((achievement, index) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={styles.achievementText}>{achievement.title}</Text>
                  <View style={[
                    styles.rarityDot, 
                    { backgroundColor: getRarityColor(achievement.rarity) }
                  ]} />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.tapHint}>Tap for detailed insights →</Text>
        </View>
      </TouchableOpacity>

      {/* Detailed Stats Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Detailed Statistics</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Today's Detailed Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Today's Performance</Text>
            <View style={styles.detailedStatsGrid}>
              <View style={styles.detailedStatCard}>
                <Text style={styles.detailedStatNumber}>{todayStats.scansCount}</Text>
                <Text style={styles.detailedStatLabel}>Total Scans</Text>
              </View>
              
              <View style={styles.detailedStatCard}>
                <Text style={styles.detailedStatNumber}>{todayStats.duplicatesCount}</Text>
                <Text style={styles.detailedStatLabel}>Duplicates</Text>
              </View>
              
              <View style={styles.detailedStatCard}>
                <Text style={styles.detailedStatNumber}>{todayStats.bestStreak}</Text>
                <Text style={styles.detailedStatLabel}>Best Streak</Text>
              </View>
            </View>

            {/* Actions Breakdown */}
            <View style={styles.actionsBreakdown}>
              <Text style={styles.subsectionTitle}>Actions Breakdown</Text>
              <View style={styles.actionsList}>
                <View style={styles.actionItem}>
                  <Text style={styles.actionIcon}>📥</Text>
                  <Text style={styles.actionLabel}>Check In</Text>
                  <Text style={styles.actionCount}>{todayStats.actionsBreakdown.in}</Text>
                </View>
                <View style={styles.actionItem}>
                  <Text style={styles.actionIcon}>📤</Text>
                  <Text style={styles.actionLabel}>Check Out</Text>
                  <Text style={styles.actionCount}>{todayStats.actionsBreakdown.out}</Text>
                </View>
                <View style={styles.actionItem}>
                  <Text style={styles.actionIcon}>🔍</Text>
                  <Text style={styles.actionLabel}>Locate</Text>
                  <Text style={styles.actionCount}>{todayStats.actionsBreakdown.locate}</Text>
                </View>
                <View style={styles.actionItem}>
                  <Text style={styles.actionIcon}>⛽</Text>
                  <Text style={styles.actionLabel}>Fill</Text>
                  <Text style={styles.actionCount}>{todayStats.actionsBreakdown.fill}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Weekly Overview */}
          {weeklyStats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Weekly Overview</Text>
              <View style={styles.weeklyStatsGrid}>
                <View style={styles.weeklyStatCard}>
                  <Text style={styles.weeklyStatNumber}>{weeklyStats.totalScans}</Text>
                  <Text style={styles.weeklyStatLabel}>Total Scans</Text>
                </View>
                <View style={styles.weeklyStatCard}>
                  <Text style={styles.weeklyStatNumber}>{Math.round(weeklyStats.avgScansPerDay)}</Text>
                  <Text style={styles.weeklyStatLabel}>Daily Average</Text>
                </View>
                <View style={styles.weeklyStatCard}>
                  <Text style={styles.weeklyStatNumber}>{weeklyStats.uniqueCustomers}</Text>
                  <Text style={styles.weeklyStatLabel}>Unique Customers</Text>
                </View>
                <View style={styles.weeklyStatCard}>
                  <Text style={styles.weeklyStatNumber}>{weeklyStats.totalBatches}</Text>
                  <Text style={styles.weeklyStatLabel}>Batches</Text>
                </View>
              </View>
            </View>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Insights</Text>
              {insights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* All Achievements */}
          {recentAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
              {recentAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.detailedAchievementItem}>
                  <Text style={styles.detailedAchievementIcon}>{achievement.icon}</Text>
                  <View style={styles.detailedAchievementContent}>
                    <Text style={styles.detailedAchievementTitle}>{achievement.title}</Text>
                    <Text style={styles.detailedAchievementDesc}>{achievement.description}</Text>
                    <Text style={[
                      styles.detailedAchievementRarity,
                      { color: getRarityColor(achievement.rarity) }
                    ]}>
                      {achievement.rarity.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  productivityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  productivityIcon: {
    fontSize: 16,
  },
  productivityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  achievementsContainer: {
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  achievementsList: {
    gap: 6,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  achievementIcon: {
    fontSize: 16,
  },
  achievementText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footer: {
    alignItems: 'center',
  },
  tapHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
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
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 16,
  },
  detailedStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailedStatCard: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  detailedStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  detailedStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsBreakdown: {
    marginTop: 16,
  },
  actionsList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionIcon: {
    fontSize: 16,
    width: 24,
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  weeklyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weeklyStatCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    width: (width - 80) / 2,
  },
  weeklyStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  weeklyStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  insightItem: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  insightText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  detailedAchievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  detailedAchievementIcon: {
    fontSize: 24,
  },
  detailedAchievementContent: {
    flex: 1,
  },
  detailedAchievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  detailedAchievementDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailedAchievementRarity: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
