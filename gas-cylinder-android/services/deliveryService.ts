import { supabase } from '../supabase';

export interface Delivery {
  id: string;
  order_id: string;
  driver_id: string;
  customer_id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  scheduled_date: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

class DeliveryService {
  async getDriverDeliveries(driverId: string): Promise<Delivery[]> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          customers:customer_id (
            name,
            address,
            phone
          )
        `)
        .eq('driver_id', driverId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(delivery => ({
        ...delivery,
        customer_name: delivery.customers?.name || 'Unknown Customer',
        customer_address: delivery.customers?.address || 'No Address',
        customer_phone: delivery.customers?.phone || 'No Phone'
      })) || [];
    } catch (error) {
      console.error('Error fetching driver deliveries:', error);
      throw error;
    }
  }

  async updateDeliveryStatus(deliveryId: string, status: Delivery['status']): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  async getDeliveryById(deliveryId: string): Promise<Delivery | null> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          customers:customer_id (
            name,
            address,
            phone
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (error) throw error;

      return {
        ...data,
        customer_name: data.customers?.name || 'Unknown Customer',
        customer_address: data.customers?.address || 'No Address',
        customer_phone: data.customers?.phone || 'No Phone'
      };
    } catch (error) {
      console.error('Error fetching delivery by ID:', error);
      return null;
    }
  }

  async createDelivery(deliveryData: Partial<Delivery>): Promise<Delivery> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .insert(deliveryData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
  }

  async getDeliveriesByStatus(status: Delivery['status']): Promise<Delivery[]> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          customers:customer_id (
            name,
            address,
            phone
          )
        `)
        .eq('status', status)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      return data?.map(delivery => ({
        ...delivery,
        customer_name: delivery.customers?.name || 'Unknown Customer',
        customer_address: delivery.customers?.address || 'No Address',
        customer_phone: delivery.customers?.phone || 'No Phone'
      })) || [];
    } catch (error) {
      console.error('Error fetching deliveries by status:', error);
      throw error;
    }
  }
}

export const deliveryService = new DeliveryService();
