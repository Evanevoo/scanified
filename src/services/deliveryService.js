import logger from '../utils/logger';
import { supabase } from '../supabase/client';

export const deliveryService = {
  // Create a new delivery
  async createDelivery(deliveryData) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .insert([{
          ...deliveryData,
          status: 'scheduled',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating delivery:', error);
      throw error;
    }
  },

  // Get all deliveries (without organization filter initially)
  async getDeliveries(filters = {}) {
    try {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          customer:customers!deliveries_customer_id_fkey(*),
          driver:profiles(*),
          delivery_items(
            *,
            bottle:bottles(*)
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters.date) {
        query = query.eq('delivery_date', filters.date);
      }

      const { data, error } = await query.order('delivery_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting deliveries:', error);
      throw error;
    }
  },

  // Update delivery status
  async updateDeliveryStatus(deliveryId, status, driverId = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (driverId) {
        updateData.driver_id = driverId;
      }

      if (status === 'in_transit') {
        updateData.departure_time = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivery_time_actual = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating delivery status:', error);
      throw error;
    }
  },

  // Assign driver to delivery
  async assignDriver(deliveryId, driverId) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          driver_id: driverId,
          assigned_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error assigning driver:', error);
      throw error;
    }
  },

  // Get driver's deliveries
  async getDriverDeliveries(driverId, date = null) {
    try {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          customer:customers!deliveries_customer_id_fkey(*),
          delivery_items(
            *,
            bottle:bottles(*)
          )
        `)
        .eq('driver_id', driverId);

      if (date) {
        query = query.eq('delivery_date', date);
      }

      const { data, error } = await query.order('delivery_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting driver deliveries:', error);
      throw error;
    }
  },

  // Optimize delivery route
  async optimizeRoute(deliveries) {
    try {
      // Simple route optimization (nearest neighbor algorithm)
      const optimizedDeliveries = [...deliveries];
      
      // Sort by distance from warehouse (simplified)
      optimizedDeliveries.sort((a, b) => {
        const distanceA = this.calculateDistance(
          { lat: 0, lng: 0 }, // Warehouse coordinates
          { lat: a.customer?.latitude || 0, lng: a.customer?.longitude || 0 }
        );
        const distanceB = this.calculateDistance(
          { lat: 0, lng: 0 },
          { lat: b.customer?.latitude || 0, lng: b.customer?.longitude || 0 }
        );
        return distanceA - distanceB;
      });

      return optimizedDeliveries;
    } catch (error) {
      logger.error('Error optimizing route:', error);
      return deliveries;
    }
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  },

  // Get delivery statistics
  async getDeliveryStats(dateRange = null) {
    try {
      let query = supabase
        .from('deliveries')
        .select('*');

      if (dateRange) {
        query = query.gte('delivery_date', dateRange.start)
                    .lte('delivery_date', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data.length,
        scheduled: data.filter(d => d.status === 'scheduled').length,
        inTransit: data.filter(d => d.status === 'in_transit').length,
        delivered: data.filter(d => d.status === 'delivered').length,
        cancelled: data.filter(d => d.status === 'cancelled').length,
        onTime: data.filter(d => d.status === 'delivered' && !d.is_late).length,
        late: data.filter(d => d.status === 'delivered' && d.is_late).length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting delivery stats:', error);
      throw error;
    }
  },

  // Update delivery location
  async updateDeliveryLocation(deliveryId, latitude, longitude) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          location_updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating delivery location:', error);
      throw error;
    }
  },

  // Get delivery zones
  async getDeliveryZones() {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting delivery zones:', error);
      throw error;
    }
  },

  // Create delivery zone
  async createDeliveryZone(zoneData) {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert([{
          ...zoneData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating delivery zone:', error);
      throw error;
    }
  },

  // Get drivers (all users with driver role)
  async getDrivers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting drivers:', error);
      throw error;
    }
  },

  // Schedule delivery
  async scheduleDelivery(deliveryData) {
    try {
      // Check driver availability
      if (deliveryData.driver_id) {
        const driverDeliveries = await this.getDriverDeliveries(
          deliveryData.driver_id,
          deliveryData.delivery_date
        );

        // Simple availability check (can be enhanced)
        if (driverDeliveries.length >= 10) {
          throw new Error('Driver has too many deliveries on this date');
        }
      }

      const delivery = await this.createDelivery(deliveryData);
      return delivery;
    } catch (error) {
      logger.error('Error scheduling delivery:', error);
      throw error;
    }
  },

  // Get delivery route
  async getDeliveryRoute(deliveryId) {
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('sequence');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting delivery route:', error);
      throw error;
    }
  },

  // Create delivery route
  async createDeliveryRoute(routeData) {
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert([{
          ...routeData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating delivery route:', error);
      throw error;
    }
  }
}; 