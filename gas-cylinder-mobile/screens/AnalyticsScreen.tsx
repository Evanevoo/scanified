import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { formatDateLocal } from '../utils/dateUtils';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../context/AssetContext';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalScans: number;
  todayScans: number;
  thisWeekScans: number;
  thisMonthScans: number;
  totalAssets: number;
  activeAssets: number;
  totalCustomers: number;
  recentActivity: Array<{
    id: string;
    action: string;
    asset_id: string;
    customer_name: string;
    timestamp: string;
  }>;
  topCustomers: Array<{
    customer_name: string;
    asset_count: number;
  }>;
  scanTrends: Array<{
    date: string;
    count: number;
  }>;
}

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAnalyticsData();
    }
  }, [profile, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      const orgId = profile.organization_id;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [
        scansResult,
        assetsResult,
        customersResult,
        recentActivityResult,
        topCustomersResult,
        scanTrendsResult
      ] = await Promise.all([
        // Scan counts - try bottle_scans first, fallback to scans
        (async () => {
          let result = await supabase
            .from('bottle_scans')
            .select('id, created_at')
            .eq('organization_id', orgId);
          
          // If bottle_scans doesn't exist, try scans table
          if (result.error && result.error.message?.includes('relation') && result.error.message?.includes('does not exist')) {
            logger.log('bottle_scans table not found, trying scans table...');
            result = await supabase
              .from('scans')
              .select('id, created_at')
              .eq('organization_id', orgId);
          }
          return result;
        })(),
        
        // Asset counts
        supabase
          .from('bottles')
          .select('id, assigned_customer')
          .eq('organization_id', orgId),
        
        // Customer count
        supabase
          .from('customers')
          .select('id')
          .eq('organization_id', orgId),
        
        // Recent activity - try bottle_scans first, fallback to scans
        (async () => {
          let result = await supabase
            .from('bottle_scans')
            .select('id, mode, bottle_barcode, customer_name, created_at')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(10);
          
          // If bottle_scans doesn't exist, try scans table
          if (result.error && result.error.message?.includes('relation') && result.error.message?.includes('does not exist')) {
            logger.log('bottle_scans table not found, trying scans table...');
            result = await supabase
              .from('scans')
              .select('id, action, bottle_id, customer_name, created_at')
              .eq('organization_id', orgId)
              .order('created_at', { ascending: false })
              .limit(10);
          }
          return result;
        })(),
        
        // Top customers
        supabase
          .from('bottles')
          .select('customer_name')
          .eq('organization_id', orgId)
          .not('customer_name', 'is', null),
        
        // Scan trends (last 7 days) - try bottle_scans first, fallback to scans
        (async () => {
          let result = await supabase
            .from('bottle_scans')
            .select('created_at')
            .eq('organization_id', orgId)
            .gte('created_at', weekAgo.toISOString())
            .order('created_at', { ascending: true });
          
          // If bottle_scans doesn't exist, try scans table
          if (result.error && result.error.message?.includes('relation') && result.error.message?.includes('does not exist')) {
            logger.log('bottle_scans table not found, trying scans table...');
            result = await supabase
              .from('scans')
              .select('created_at')
              .eq('organization_id', orgId)
              .gte('created_at', weekAgo.toISOString())
              .order('created_at', { ascending: true });
          }
          return result;
        })()
      ]);

      // Process scan data
      const allScans = scansResult.data || [];
      const totalScans = allScans.length;
      const todayScans = allScans.filter(scan => 
        new Date(scan.created_at) >= today
      ).length;
      const thisWeekScans = allScans.filter(scan => 
        new Date(scan.created_at) >= weekAgo
      ).length;
      const thisMonthScans = allScans.filter(scan => 
        new Date(scan.created_at) >= monthAgo
      ).length;

      // Process asset data
      const allAssets = assetsResult.data || [];
      const totalAssets = allAssets.length;
      const activeAssets = allAssets.filter(asset => asset.assigned_customer).length;

      // Process customer data
      const totalCustomers = customersResult.data?.length || 0;

      // Process recent activity
      const recentActivity = (recentActivityResult.data || []).map(scan => {
        // Handle both bottle_scans (mode) and scans (action) schemas
        const action = scan.mode ? (scan.mode === 'SHIP' ? 'out' : scan.mode === 'RETURN' ? 'in' : scan.mode.toLowerCase()) : scan.action;
        const asset_id = scan.bottle_barcode || scan.bottles?.barcode_number || scan.bottle_id;
        
        return {
          id: scan.id,
          action: action,
          asset_id: asset_id,
          customer_name: scan.customer_name || 'Unknown',
          timestamp: scan.created_at
        };
      });

      // Process top customers
      const customerCounts = (topCustomersResult.data || []).reduce((acc, asset) => {
        const customer = asset.customer_name;
        if (customer) {
          acc[customer] = (acc[customer] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topCustomers = Object.entries(customerCounts)
        .map(([customer_name, asset_count]) => ({ customer_name, asset_count }))
        .sort((a, b) => b.asset_count - a.asset_count)
        .slice(0, 5);

      // Process scan trends
      const scanTrends = (scanTrendsResult.data || []).reduce((acc, scan) => {
        const date = new Date(scan.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const scanTrendsArray = Object.entries(scanTrends)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      setAnalyticsData({
        totalScans,
        todayScans,
        thisWeekScans,
        thisMonthScans,
        totalAssets,
        activeAssets,
        totalCustomers,
        recentActivity,
        topCustomers,
        scanTrends: scanTrendsArray
      });

    } catch (error) {
      logger.error('Error fetching analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const getPeriodData = () => {
    if (!analyticsData) return { scans: 0, label: '' };
    
    switch (selectedPeriod) {
      case 'today':
        return { scans: analyticsData.todayScans, label: 'Today' };
      case 'week':
        return { scans: analyticsData.thisWeekScans, label: 'This Week' };
      case 'month':
        return { scans: analyticsData.thisMonthScans, label: 'This Month' };
      default:
        return { scans: analyticsData.todayScans, label: 'Today' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return formatDateLocal(dateString);
    }
  };

  const StatCard = ({ title, value, icon, color = colors.primary }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      </View>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  if (loading && !analyticsData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading analytics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Error Loading Analytics</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchAnalyticsData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!analyticsData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Available</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start scanning {assetConfig.assetDisplayNamePlural?.toLowerCase()} to see analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const periodData = getPeriodData();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {assetConfig.appName} Analytics
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your {assetConfig.assetDisplayNamePlural?.toLowerCase()} operations
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                {
                  backgroundColor: selectedPeriod === period ? colors.primary : colors.surface,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color: selectedPeriod === period ? colors.surface : colors.text
                  }
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <StatCard
            title={`${periodData.label} Scans`}
            value={periodData.scans}
            icon="scan"
            color={colors.primary}
          />
          <StatCard
            title="Total Assets"
            value={analyticsData.totalAssets}
            icon="cube"
            color={colors.success}
          />
          <StatCard
            title="Active Assets"
            value={analyticsData.activeAssets}
            icon="checkmark-circle"
            color={colors.warning}
          />
          <StatCard
            title="Customers"
            value={analyticsData.totalCustomers}
            icon="people"
            color={colors.info}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <View style={[styles.activityContainer, { backgroundColor: colors.surface }]}>
            {analyticsData.recentActivity.length > 0 ? (
              analyticsData.recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons
                      name={activity.action === 'in' ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={activity.action === 'in' ? colors.success : colors.warning}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityText, { color: colors.text }]}>
                      {activity.action === 'in' ? 'Received' : 'Shipped'} {activity.asset_id}
                    </Text>
                    <Text style={[styles.activityCustomer, { color: colors.textSecondary }]}>
                      {activity.customer_name}
                    </Text>
                  </View>
                  <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                    {formatDate(activity.timestamp)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No recent activity
              </Text>
            )}
          </View>
        </View>

        {/* Top Customers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Customers</Text>
          <View style={[styles.customersContainer, { backgroundColor: colors.surface }]}>
            {analyticsData.topCustomers.length > 0 ? (
              analyticsData.topCustomers.map((customer, index) => (
                <View key={customer.customer_name} style={styles.customerItem}>
                  <View style={styles.customerRank}>
                    <Text style={[styles.customerRankText, { color: colors.textSecondary }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.customerContent}>
                    <Text style={[styles.customerName, { color: colors.text }]}>
                      {customer.customer_name}
                    </Text>
                    <Text style={[styles.customerCount, { color: colors.textSecondary }]}>
                      {customer.asset_count} {assetConfig.assetDisplayNamePlural?.toLowerCase()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No customer data available
              </Text>
            )}
          </View>
        </View>

        {/* Scan Trends */}
        {analyticsData.scanTrends.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Scan Trends (Last 7 Days)</Text>
            <View style={[styles.trendsContainer, { backgroundColor: colors.surface }]}>
              {analyticsData.scanTrends.map((trend) => (
                <View key={trend.date} style={styles.trendItem}>
                  <Text style={[styles.trendDate, { color: colors.textSecondary }]}>
                    {new Date(trend.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <View style={styles.trendBar}>
                    <View
                      style={[
                        styles.trendBarFill,
                        {
                          width: `${Math.min(100, (trend.count / Math.max(...analyticsData.scanTrends.map(t => t.count))) * 100)}%`,
                          backgroundColor: colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.trendCount, { color: colors.text }]}>
                    {trend.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginRight: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  activityContainer: {
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityCustomer: {
    fontSize: 14,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  customersContainer: {
    borderRadius: 12,
    padding: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  customerRank: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  customerRankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerContent: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  customerCount: {
    fontSize: 14,
    marginTop: 2,
  },
  trendsContainer: {
    borderRadius: 12,
    padding: 16,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  trendDate: {
    width: 60,
    fontSize: 12,
  },
  trendBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  trendBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  trendCount: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
});
