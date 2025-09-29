import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

/**
 * Statistics Service - Tracks personal productivity metrics and daily summaries
 * Provides insights into scanning patterns, productivity trends, and achievements
 */

export interface DailyStats {
  date: string; // YYYY-MM-DD format
  scansCount: number;
  batchesCount: number;
  duplicatesCount: number;
  actionsBreakdown: {
    in: number;
    out: number;
    locate: number;
    fill: number;
  };
  customersScanned: string[];
  locationsVisited: string[];
  hoursActive: number;
  averageScanTime: number; // seconds between scans
  bestStreak: number; // consecutive scans without duplicates
  achievements: string[];
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD format
  totalScans: number;
  avgScansPerDay: number;
  mostProductiveDay: string;
  totalBatches: number;
  uniqueCustomers: number;
  uniqueLocations: number;
  achievements: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number;
  type: 'scanning' | 'productivity' | 'streak' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

class StatsService {
  private todayStats: DailyStats | null = null;
  private achievements: Achievement[] = [];
  private isInitialized = false;

  /**
   * Initialize the stats service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadTodayStats();
      await this.loadAchievements();
      this.isInitialized = true;
      console.log('📊 StatsService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize StatsService:', error);
    }
  }

  /**
   * Load today's statistics
   */
  private async loadTodayStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stored = await AsyncStorage.getItem(`daily_stats_${today}`);
      
      if (stored) {
        this.todayStats = JSON.parse(stored);
      } else {
        this.todayStats = this.createEmptyDayStats(today);
      }
    } catch (error) {
      console.error('Error loading today stats:', error);
      const today = new Date().toISOString().split('T')[0];
      this.todayStats = this.createEmptyDayStats(today);
    }
  }

  /**
   * Load achievements from storage
   */
  private async loadAchievements() {
    try {
      const stored = await AsyncStorage.getItem('user_achievements');
      if (stored) {
        this.achievements = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      this.achievements = [];
    }
  }

  /**
   * Create empty day stats
   */
  private createEmptyDayStats(date: string): DailyStats {
    return {
      date,
      scansCount: 0,
      batchesCount: 0,
      duplicatesCount: 0,
      actionsBreakdown: {
        in: 0,
        out: 0,
        locate: 0,
        fill: 0,
      },
      customersScanned: [],
      locationsVisited: [],
      hoursActive: 0,
      averageScanTime: 0,
      bestStreak: 0,
      achievements: [],
    };
  }

  /**
   * Record a scan activity
   */
  async recordScan(data: {
    action: 'in' | 'out' | 'locate' | 'fill';
    customer?: string;
    location?: string;
    isDuplicate?: boolean;
    isBatchMode?: boolean;
    timestamp: number;
  }) {
    if (!this.todayStats) await this.loadTodayStats();
    if (!this.todayStats) return;

    const { action, customer, location, isDuplicate, isBatchMode, timestamp } = data;

    // Update basic counters
    this.todayStats.scansCount++;
    this.todayStats.actionsBreakdown[action]++;

    if (isDuplicate) {
      this.todayStats.duplicatesCount++;
    }

    // Track unique customers and locations
    if (customer && !this.todayStats.customersScanned.includes(customer)) {
      this.todayStats.customersScanned.push(customer);
    }

    if (location && !this.todayStats.locationsVisited.includes(location)) {
      this.todayStats.locationsVisited.push(location);
    }

    // Calculate average scan time and activity hours
    await this.updateTimeMetrics(timestamp);

    // Check for achievements
    await this.checkAchievements();

    // Save updated stats
    await this.saveTodayStats();
  }

  /**
   * Record a batch scanning session
   */
  async recordBatch(data: {
    scansInBatch: number;
    duplicatesInBatch: number;
    startTime: number;
    endTime: number;
  }) {
    if (!this.todayStats) await this.loadTodayStats();
    if (!this.todayStats) return;

    this.todayStats.batchesCount++;
    
    // Update streak if no duplicates in batch
    if (data.duplicatesInBatch === 0) {
      this.todayStats.bestStreak = Math.max(this.todayStats.bestStreak, data.scansInBatch);
    }

    // Check for batch-related achievements
    await this.checkBatchAchievements(data);
    await this.saveTodayStats();
  }

  /**
   * Update time-based metrics
   */
  private async updateTimeMetrics(timestamp: number) {
    // This is a simplified implementation
    // In a real app, you might track more detailed time patterns
    const hour = new Date(timestamp).getHours();
    const isWorkingHours = hour >= 8 && hour <= 18;
    
    if (isWorkingHours) {
      this.todayStats!.hoursActive = Math.max(this.todayStats!.hoursActive, hour - 7);
    }
  }

  /**
   * Check for new achievements
   */
  private async checkAchievements() {
    if (!this.todayStats) return;

    const newAchievements: Achievement[] = [];

    // Scanning milestones
    const scanMilestones = [
      { count: 10, title: 'Getting Started', desc: 'Scanned 10 items in a day', icon: '🎯', rarity: 'common' as const },
      { count: 50, title: 'Productive Day', desc: 'Scanned 50 items in a day', icon: '🚀', rarity: 'rare' as const },
      { count: 100, title: 'Scan Master', desc: 'Scanned 100 items in a day', icon: '👑', rarity: 'epic' as const },
      { count: 200, title: 'Legendary Scanner', desc: 'Scanned 200 items in a day', icon: '⚡', rarity: 'legendary' as const },
    ];

    for (const milestone of scanMilestones) {
      if (this.todayStats.scansCount >= milestone.count && 
          !this.achievements.some(a => a.title === milestone.title)) {
        
        const achievement: Achievement = {
          id: `scan_${milestone.count}_${Date.now()}`,
          title: milestone.title,
          description: milestone.desc,
          icon: milestone.icon,
          unlockedAt: Date.now(),
          type: 'milestone',
          rarity: milestone.rarity,
        };
        
        newAchievements.push(achievement);
      }
    }

    // Streak achievements
    if (this.todayStats.bestStreak >= 20 && 
        !this.achievements.some(a => a.title === 'Perfect Streak')) {
      
      newAchievements.push({
        id: `streak_20_${Date.now()}`,
        title: 'Perfect Streak',
        description: 'Scanned 20 items without duplicates',
        icon: '🔥',
        unlockedAt: Date.now(),
        type: 'streak',
        rarity: 'rare',
      });
    }

    // Variety achievements
    if (this.todayStats.customersScanned.length >= 10 && 
        !this.achievements.some(a => a.title === 'People Person')) {
      
      newAchievements.push({
        id: `customers_10_${Date.now()}`,
        title: 'People Person',
        description: 'Scanned for 10 different customers in a day',
        icon: '👥',
        unlockedAt: Date.now(),
        type: 'productivity',
        rarity: 'rare',
      });
    }

    // Location achievements
    if (this.todayStats.locationsVisited.length >= 5 && 
        !this.achievements.some(a => a.title === 'Explorer')) {
      
      newAchievements.push({
        id: `locations_5_${Date.now()}`,
        title: 'Explorer',
        description: 'Visited 5 different locations in a day',
        icon: '🗺️',
        unlockedAt: Date.now(),
        type: 'productivity',
        rarity: 'common',
      });
    }

    // Add new achievements
    if (newAchievements.length > 0) {
      this.achievements.push(...newAchievements);
      this.todayStats.achievements.push(...newAchievements.map(a => a.id));
      await this.saveAchievements();
    }
  }

  /**
   * Check for batch-specific achievements
   */
  private async checkBatchAchievements(data: {
    scansInBatch: number;
    duplicatesInBatch: number;
    startTime: number;
    endTime: number;
  }) {
    const newAchievements: Achievement[] = [];

    // Fast batch achievement
    const duration = (data.endTime - data.startTime) / 1000; // seconds
    const scansPerMinute = (data.scansInBatch / duration) * 60;

    if (scansPerMinute > 30 && data.scansInBatch >= 20 && 
        !this.achievements.some(a => a.title === 'Speed Demon')) {
      
      newAchievements.push({
        id: `speed_batch_${Date.now()}`,
        title: 'Speed Demon',
        description: 'Scanned over 30 items per minute in batch mode',
        icon: '⚡',
        unlockedAt: Date.now(),
        type: 'scanning',
        rarity: 'epic',
      });
    }

    // Perfect batch achievement
    if (data.scansInBatch >= 50 && data.duplicatesInBatch === 0 && 
        !this.achievements.some(a => a.title === 'Perfectionist')) {
      
      newAchievements.push({
        id: `perfect_batch_${Date.now()}`,
        title: 'Perfectionist',
        description: 'Completed a 50+ scan batch with no duplicates',
        icon: '💎',
        unlockedAt: Date.now(),
        type: 'scanning',
        rarity: 'legendary',
      });
    }

    // Add new achievements
    if (newAchievements.length > 0) {
      this.achievements.push(...newAchievements);
      this.todayStats!.achievements.push(...newAchievements.map(a => a.id));
      await this.saveAchievements();
    }
  }

  /**
   * Get today's statistics
   */
  async getTodayStats(): Promise<DailyStats> {
    if (!this.todayStats) await this.loadTodayStats();
    return this.todayStats!;
  }

  /**
   * Get weekly statistics
   */
  async getWeeklyStats(): Promise<WeeklyStats> {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      
      const weekStats: WeeklyStats = {
        weekStart: weekStart.toISOString().split('T')[0],
        totalScans: 0,
        avgScansPerDay: 0,
        mostProductiveDay: '',
        totalBatches: 0,
        uniqueCustomers: 0,
        uniqueLocations: 0,
        achievements: [],
      };

      // Load stats for each day of the week
      const allCustomers = new Set<string>();
      const allLocations = new Set<string>();
      let maxScans = 0;
      let totalScans = 0;
      let daysWithData = 0;

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const stored = await AsyncStorage.getItem(`daily_stats_${dateStr}`);
          if (stored) {
            const dayStats: DailyStats = JSON.parse(stored);
            totalScans += dayStats.scansCount;
            weekStats.totalBatches += dayStats.batchesCount;
            
            dayStats.customersScanned.forEach(c => allCustomers.add(c));
            dayStats.locationsVisited.forEach(l => allLocations.add(l));
            weekStats.achievements.push(...dayStats.achievements);
            
            if (dayStats.scansCount > maxScans) {
              maxScans = dayStats.scansCount;
              weekStats.mostProductiveDay = dateStr;
            }
            
            if (dayStats.scansCount > 0) daysWithData++;
          }
        } catch (error) {
          console.warn(`Error loading stats for ${dateStr}:`, error);
        }
      }

      weekStats.totalScans = totalScans;
      weekStats.avgScansPerDay = daysWithData > 0 ? totalScans / daysWithData : 0;
      weekStats.uniqueCustomers = allCustomers.size;
      weekStats.uniqueLocations = allLocations.size;

      return weekStats;
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      return {
        weekStart: weekStart.toISOString().split('T')[0],
        totalScans: 0,
        avgScansPerDay: 0,
        mostProductiveDay: '',
        totalBatches: 0,
        uniqueCustomers: 0,
        uniqueLocations: 0,
        achievements: [],
      };
    }
  }

  /**
   * Get recent achievements
   */
  getRecentAchievements(limit: number = 5): Achievement[] {
    return this.achievements
      .sort((a, b) => b.unlockedAt - a.unlockedAt)
      .slice(0, limit);
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return [...this.achievements];
  }

  /**
   * Save today's stats to storage
   */
  private async saveTodayStats() {
    if (!this.todayStats) return;
    
    try {
      await AsyncStorage.setItem(
        `daily_stats_${this.todayStats.date}`, 
        JSON.stringify(this.todayStats)
      );
    } catch (error) {
      console.error('Error saving today stats:', error);
    }
  }

  /**
   * Save achievements to storage
   */
  private async saveAchievements() {
    try {
      await AsyncStorage.setItem('user_achievements', JSON.stringify(this.achievements));
    } catch (error) {
      console.error('Error saving achievements:', error);
    }
  }

  /**
   * Clear all statistics (for testing or reset)
   */
  async clearAllStats() {
    try {
      // Clear today's stats
      this.todayStats = null;
      
      // Clear achievements
      this.achievements = [];
      
      // Clear stored data
      const keys = await AsyncStorage.getAllKeys();
      const statsKeys = keys.filter(key => 
        key.startsWith('daily_stats_') || key === 'user_achievements'
      );
      
      await AsyncStorage.multiRemove(statsKeys);
      
      console.log('📊 All statistics cleared');
    } catch (error) {
      console.error('Error clearing stats:', error);
    }
  }

  /**
   * Get productivity insights
   */
  async getInsights(): Promise<string[]> {
    const todayStats = await this.getTodayStats();
    const weeklyStats = await this.getWeeklyStats();
    const insights: string[] = [];

    // Today vs yesterday comparison
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const stored = await AsyncStorage.getItem(`daily_stats_${yesterdayStr}`);
      
      if (stored) {
        const yesterdayStats: DailyStats = JSON.parse(stored);
        const improvement = todayStats.scansCount - yesterdayStats.scansCount;
        
        if (improvement > 0) {
          insights.push(`📈 You're ${improvement} scans ahead of yesterday!`);
        } else if (improvement < 0) {
          insights.push(`📉 You scanned ${Math.abs(improvement)} fewer items than yesterday`);
        } else {
          insights.push(`📊 Same productivity as yesterday`);
        }
      }
    } catch (error) {
      // Ignore comparison if yesterday's data isn't available
    }

    // Weekly insights
    if (weeklyStats.totalScans > 0) {
      insights.push(`🎯 Weekly total: ${weeklyStats.totalScans} scans`);
      insights.push(`📅 Daily average: ${Math.round(weeklyStats.avgScansPerDay)} scans`);
      
      if (weeklyStats.uniqueCustomers > 0) {
        insights.push(`👥 Served ${weeklyStats.uniqueCustomers} unique customers this week`);
      }
    }

    // Achievement insights
    const todayAchievements = this.achievements.filter(a => 
      new Date(a.unlockedAt).toDateString() === new Date().toDateString()
    );
    
    if (todayAchievements.length > 0) {
      insights.push(`🏆 Unlocked ${todayAchievements.length} achievement${todayAchievements.length > 1 ? 's' : ''} today!`);
    }

    return insights;
  }
}

// Export singleton instance
export const statsService = new StatsService();
export default statsService;
