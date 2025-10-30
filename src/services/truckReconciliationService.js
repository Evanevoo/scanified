import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Truck Reconciliation Service
 * Handles delivery manifests, route management, and truck reconciliation
 */

export class TruckReconciliationService {
  /**
   * Create a new delivery route
   */
  static async createDeliveryRoute(organizationId, routeData) {
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert([{
          organization_id: organizationId,
          route_name: routeData.routeName,
          route_code: routeData.routeCode,
          driver_id: routeData.driverId,
          truck_id: routeData.truckId,
          estimated_duration: routeData.estimatedDuration,
          total_distance: routeData.totalDistance,
          route_notes: routeData.notes
        }])
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Delivery route created:', data.route_name);
      return data;

    } catch (error) {
      logger.error('❌ Error creating delivery route:', error);
      throw error;
    }
  }

  /**
   * Get all delivery routes for an organization
   */
  static async getDeliveryRoutes(organizationId, filters = {}) {
    try {
      let query = supabase
        .from('delivery_routes')
        .select(`
          *,
          driver:profiles!delivery_routes_driver_id_fkey(id, full_name, email),
          stops:delivery_stops(count)
        `)
        .eq('organization_id', organizationId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('❌ Error fetching delivery routes:', error);
      throw error;
    }
  }

  /**
   * Create a delivery manifest
   */
  static async createDeliveryManifest(organizationId, manifestData) {
    try {
      const { data, error } = await supabase
        .rpc('create_delivery_manifest', {
          p_organization_id: organizationId,
          p_route_id: manifestData.routeId,
          p_manifest_type: manifestData.manifestType || 'delivery',
          p_driver_id: manifestData.driverId,
          p_truck_id: manifestData.truckId,
          p_manifest_date: manifestData.manifestDate,
          p_created_by: manifestData.createdBy
        });

      if (error) throw error;

      logger.log('✅ Delivery manifest created:', data[0].manifest_number);
      return data[0];

    } catch (error) {
      logger.error('❌ Error creating delivery manifest:', error);
      throw error;
    }
  }

  /**
   * Get delivery manifests
   */
  static async getDeliveryManifests(organizationId, filters = {}) {
    try {
      let query = supabase
        .from('delivery_manifests')
        .select(`
          *,
          route:delivery_routes(route_name, route_code),
          driver:profiles!delivery_manifests_driver_id_fkey(id, full_name),
          items:manifest_items(count),
          reconciliation:truck_reconciliations(id, status, reconciliation_date)
        `)
        .eq('organization_id', organizationId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }

      if (filters.dateFrom) {
        query = query.gte('manifest_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('manifest_date', filters.dateTo);
      }

      const { data, error } = await query.order('manifest_date', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('❌ Error fetching delivery manifests:', error);
      throw error;
    }
  }

  /**
   * Add items to a manifest
   */
  static async addManifestItems(manifestId, items) {
    try {
      const manifestItems = items.map(item => ({
        manifest_id: manifestId,
        stop_id: item.stopId,
        bottle_id: item.bottleId,
        barcode_number: item.barcodeNumber,
        product_type: item.productType,
        size: item.size,
        action: item.action,
        expected_quantity: item.expectedQuantity || 1
      }));

      const { data, error } = await supabase
        .from('manifest_items')
        .insert(manifestItems)
        .select();

      if (error) throw error;

      // Update manifest totals
      await this.updateManifestTotals(manifestId);

      logger.log(`✅ Added ${data.length} items to manifest`);
      return data;

    } catch (error) {
      logger.error('❌ Error adding manifest items:', error);
      throw error;
    }
  }

  /**
   * Update manifest totals
   */
  static async updateManifestTotals(manifestId) {
    try {
      const { data: items, error } = await supabase
        .from('manifest_items')
        .select('action, expected_quantity')
        .eq('manifest_id', manifestId);

      if (error) throw error;

      const totals = items.reduce((acc, item) => {
        const qty = item.expected_quantity || 1;
        switch (item.action) {
          case 'deliver':
          case 'exchange_out':
            acc.out += qty;
            break;
          case 'pickup':
          case 'exchange_in':
            acc.in += qty;
            break;
        }
        if (item.action.startsWith('exchange_')) {
          acc.exchanged += qty;
        }
        return acc;
      }, { out: 0, in: 0, exchanged: 0 });

      const { error: updateError } = await supabase
        .from('delivery_manifests')
        .update({
          total_cylinders_out: totals.out,
          total_cylinders_in: totals.in,
          total_cylinders_exchanged: totals.exchanged
        })
        .eq('id', manifestId);

      if (updateError) throw updateError;

    } catch (error) {
      logger.error('❌ Error updating manifest totals:', error);
      throw error;
    }
  }

  /**
   * Start truck reconciliation
   */
  static async startTruckReconciliation(manifestId, reconciledBy) {
    try {
      const { data, error } = await supabase
        .rpc('start_truck_reconciliation', {
          p_manifest_id: manifestId,
          p_reconciled_by: reconciledBy
        });

      if (error) throw error;

      logger.log('✅ Truck reconciliation started:', data);
      return data;

    } catch (error) {
      logger.error('❌ Error starting truck reconciliation:', error);
      throw error;
    }
  }

  /**
   * Complete truck reconciliation
   */
  static async completeTruckReconciliation(reconciliationId, actualCounts, notes) {
    try {
      const { error } = await supabase
        .rpc('complete_truck_reconciliation', {
          p_reconciliation_id: reconciliationId,
          p_actual_out: actualCounts.out,
          p_actual_in: actualCounts.in,
          p_actual_exchange: actualCounts.exchange,
          p_reconciliation_notes: notes
        });

      if (error) throw error;

      logger.log('✅ Truck reconciliation completed');
      
      // Return updated reconciliation data
      return await this.getTruckReconciliation(reconciliationId);

    } catch (error) {
      logger.error('❌ Error completing truck reconciliation:', error);
      throw error;
    }
  }

  /**
   * Get truck reconciliation details
   */
  static async getTruckReconciliation(reconciliationId) {
    try {
      const { data, error } = await supabase
        .from('truck_reconciliations')
        .select(`
          *,
          manifest:delivery_manifests(manifest_number, manifest_date, truck_id),
          reconciler:profiles!truck_reconciliations_reconciled_by_fkey(full_name),
          driver:profiles!truck_reconciliations_driver_id_fkey(full_name),
          discrepancies:reconciliation_discrepancies(*)
        `)
        .eq('id', reconciliationId)
        .single();

      if (error) throw error;

      return data;

    } catch (error) {
      logger.error('❌ Error fetching truck reconciliation:', error);
      throw error;
    }
  }

  /**
   * Get truck reconciliations for an organization
   */
  static async getTruckReconciliations(organizationId, filters = {}) {
    try {
      let query = supabase
        .from('truck_reconciliations')
        .select(`
          *,
          manifest:delivery_manifests(manifest_number, manifest_date, truck_id),
          reconciler:profiles!truck_reconciliations_reconciled_by_fkey(full_name),
          driver:profiles!truck_reconciliations_driver_id_fkey(full_name)
        `)
        .eq('organization_id', organizationId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }

      if (filters.dateFrom) {
        query = query.gte('reconciliation_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('reconciliation_date', filters.dateTo);
      }

      const { data, error } = await query.order('reconciliation_date', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('❌ Error fetching truck reconciliations:', error);
      throw error;
    }
  }

  /**
   * Add reconciliation discrepancy
   */
  static async addReconciliationDiscrepancy(reconciliationId, discrepancyData) {
    try {
      const { data, error } = await supabase
        .from('reconciliation_discrepancies')
        .insert([{
          reconciliation_id: reconciliationId,
          manifest_item_id: discrepancyData.manifestItemId,
          discrepancy_type: discrepancyData.type,
          expected_barcode: discrepancyData.expectedBarcode,
          actual_barcode: discrepancyData.actualBarcode,
          expected_action: discrepancyData.expectedAction,
          actual_action: discrepancyData.actualAction,
          financial_impact: discrepancyData.financialImpact || 0,
          resolution_notes: discrepancyData.notes
        }])
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Reconciliation discrepancy added:', data.discrepancy_type);
      return data;

    } catch (error) {
      logger.error('❌ Error adding reconciliation discrepancy:', error);
      throw error;
    }
  }

  /**
   * Update driver performance
   */
  static async updateDriverPerformance(organizationId, driverId, performanceDate, metrics) {
    try {
      const { data, error } = await supabase
        .from('driver_performance')
        .upsert([{
          organization_id: organizationId,
          driver_id: driverId,
          performance_date: performanceDate,
          total_stops: metrics.totalStops,
          successful_deliveries: metrics.successfulDeliveries,
          failed_deliveries: metrics.failedDeliveries,
          on_time_deliveries: metrics.onTimeDeliveries,
          scanning_accuracy: metrics.scanningAccuracy,
          manifest_accuracy: metrics.manifestAccuracy,
          reconciliation_score: metrics.reconciliationScore,
          avg_stop_time: metrics.avgStopTime,
          total_drive_time: metrics.totalDriveTime,
          fuel_efficiency: metrics.fuelEfficiency,
          customer_rating: metrics.customerRating,
          customer_complaints: metrics.customerComplaints,
          customer_compliments: metrics.customerCompliments,
          performance_notes: metrics.notes
        }])
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Driver performance updated for:', performanceDate);
      return data;

    } catch (error) {
      logger.error('❌ Error updating driver performance:', error);
      throw error;
    }
  }

  /**
   * Get driver performance metrics
   */
  static async getDriverPerformance(organizationId, driverId, dateRange = {}) {
    try {
      let query = supabase
        .from('driver_performance')
        .select(`
          *,
          driver:profiles(full_name, email)
        `)
        .eq('organization_id', organizationId);

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      if (dateRange.from) {
        query = query.gte('performance_date', dateRange.from);
      }

      if (dateRange.to) {
        query = query.lte('performance_date', dateRange.to);
      }

      const { data, error } = await query.order('performance_date', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('❌ Error fetching driver performance:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation analytics
   */
  static async getReconciliationAnalytics(organizationId, dateRange = {}) {
    try {
      let query = supabase
        .from('truck_reconciliations')
        .select('*')
        .eq('organization_id', organizationId);

      if (dateRange.from) {
        query = query.gte('reconciliation_date', dateRange.from);
      }

      if (dateRange.to) {
        query = query.lte('reconciliation_date', dateRange.to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate analytics
      const analytics = data.reduce((acc, rec) => {
        acc.totalReconciliations++;
        acc.totalExpectedOut += rec.expected_out || 0;
        acc.totalActualOut += rec.actual_out || 0;
        acc.totalExpectedIn += rec.expected_in || 0;
        acc.totalActualIn += rec.actual_in || 0;
        acc.totalMissing += rec.missing_cylinders || 0;
        acc.totalExtra += rec.extra_cylinders || 0;
        acc.totalDiscrepancyCost += parseFloat(rec.discrepancy_cost || 0);

        if (rec.status === 'completed') acc.completedReconciliations++;
        if (rec.status === 'disputed') acc.disputedReconciliations++;

        return acc;
      }, {
        totalReconciliations: 0,
        completedReconciliations: 0,
        disputedReconciliations: 0,
        totalExpectedOut: 0,
        totalActualOut: 0,
        totalExpectedIn: 0,
        totalActualIn: 0,
        totalMissing: 0,
        totalExtra: 0,
        totalDiscrepancyCost: 0
      });

      // Calculate accuracy percentages
      analytics.outAccuracy = analytics.totalExpectedOut > 0 
        ? ((analytics.totalActualOut / analytics.totalExpectedOut) * 100).toFixed(2)
        : 100;

      analytics.inAccuracy = analytics.totalExpectedIn > 0 
        ? ((analytics.totalActualIn / analytics.totalExpectedIn) * 100).toFixed(2)
        : 100;

      analytics.completionRate = analytics.totalReconciliations > 0 
        ? ((analytics.completedReconciliations / analytics.totalReconciliations) * 100).toFixed(2)
        : 0;

      return analytics;

    } catch (error) {
      logger.error('❌ Error fetching reconciliation analytics:', error);
      throw error;
    }
  }

  /**
   * Scan item during reconciliation
   */
  static async scanManifestItem(manifestItemId, scannedData, scannedBy) {
    try {
      const { data, error } = await supabase
        .from('manifest_items')
        .update({
          actual_quantity: scannedData.quantity,
          status: scannedData.status || 'delivered',
          condition_notes: scannedData.notes,
          scanned_at: new Date().toISOString(),
          scanned_by: scannedBy
        })
        .eq('id', manifestItemId)
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Manifest item scanned:', data.barcode_number);
      return data;

    } catch (error) {
      logger.error('❌ Error scanning manifest item:', error);
      throw error;
    }
  }

  /**
   * Generate reconciliation report
   */
  static async generateReconciliationReport(reconciliationId) {
    try {
      const reconciliation = await this.getTruckReconciliation(reconciliationId);
      
      const report = {
        reconciliationId,
        manifestNumber: reconciliation.manifest?.manifest_number,
        reconciliationDate: reconciliation.reconciliation_date,
        driverName: reconciliation.driver?.full_name,
        truckId: reconciliation.truck_id,
        
        expectedCounts: {
          out: reconciliation.expected_out,
          in: reconciliation.expected_in,
          exchange: reconciliation.expected_exchange
        },
        
        actualCounts: {
          out: reconciliation.actual_out,
          in: reconciliation.actual_in,
          exchange: reconciliation.actual_exchange
        },
        
        discrepancies: {
          missing: reconciliation.missing_cylinders,
          extra: reconciliation.extra_cylinders,
          damaged: reconciliation.damaged_cylinders,
          cost: reconciliation.discrepancy_cost
        },
        
        accuracy: {
          outAccuracy: reconciliation.expected_out > 0 
            ? ((reconciliation.actual_out / reconciliation.expected_out) * 100).toFixed(2)
            : 100,
          inAccuracy: reconciliation.expected_in > 0 
            ? ((reconciliation.actual_in / reconciliation.expected_in) * 100).toFixed(2)
            : 100
        },
        
        status: reconciliation.status,
        notes: reconciliation.reconciliation_notes,
        discrepancyDetails: reconciliation.discrepancies || []
      };

      return report;

    } catch (error) {
      logger.error('❌ Error generating reconciliation report:', error);
      throw error;
    }
  }
}

export default TruckReconciliationService;
