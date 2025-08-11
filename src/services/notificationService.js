import { supabase } from '../supabase/client';

export class NotificationService {
  // Fetch notifications for a specific organization
  static async getNotifications(organizationId, options = {}) {
    try {
      const {
        limit = 50,
        unreadOnly = false,
        type = null,
        includeExpired = false
      } = options;

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (!includeExpired) {
        query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      }

      // Apply scheduled filter - only show notifications that should be visible now
      query = query.or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString());

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        notifications: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        error: error.message,
        notifications: [],
        count: 0
      };
    }
  }

  // Get unread notification count
  static async getUnreadCount(organizationId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString());

      if (error) throw error;

      return {
        success: true,
        count: count || 0
      };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mark all notifications as read for an organization
  static async markAllAsRead(organizationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('organization_id', organizationId)
        .eq('is_read', false);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create a new notification
  static async createNotification(notification) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          organization_id: notification.organizationId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          priority: notification.priority || 'normal',
          action_url: notification.actionUrl,
          action_text: notification.actionText,
          scheduled_for: notification.scheduledFor,
          expires_at: notification.expiresAt,
          created_by: notification.createdBy
        }])
        .select();

      if (error) throw error;

      return {
        success: true,
        notification: data[0]
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate yearly rental invoice notifications
  static async generateYearlyRentalNotifications(organizationId) {
    try {
      // Call the PostgreSQL function
      const { error } = await supabase.rpc('generate_yearly_rental_notifications');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error generating yearly rental notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get yearly invoice tracking data
  static async getYearlyInvoiceTracking(organizationId, year = null) {
    try {
      let query = supabase
        .from('yearly_invoice_tracking')
        .select(`
          *,
          customer:customers!yearly_invoice_tracking_customer_id_fkey (
            CustomerListID,
            name,
            contact_details,
            phone
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('invoice_year', year);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        tracking: data || []
      };
    } catch (error) {
      console.error('Error fetching yearly invoice tracking:', error);
      return {
        success: false,
        error: error.message,
        tracking: []
      };
    }
  }

  // Update yearly invoice tracking (mark as generated/sent)
  static async updateYearlyInvoiceTracking(trackingId, updates) {
    try {
      const { error } = await supabase
        .from('yearly_invoice_tracking')
        .update(updates)
        .eq('id', trackingId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating yearly invoice tracking:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create yearly rental invoice notification for specific customer
  static async createYearlyRentalNotification(organizationId, customerData) {
    try {
      const currentYear = new Date().getFullYear();
      
      const notification = {
        organizationId,
        type: 'yearly_invoice',
        title: `Yearly Rental Invoice Due - ${customerData.name}`,
        message: `Invoice for ${customerData.bottleCount} bottles (${customerData.rental_type} rental). Total: $${customerData.totalAmount}`,
        data: {
          customer_id: customerData.customer_id,
          customer_name: customerData.name,
          bottle_count: customerData.bottleCount,
          total_amount: customerData.totalAmount,
          rental_type: customerData.rental_type,
          year: currentYear,
          due_date: `${currentYear}-01-31`
        },
        priority: 'high',
        actionUrl: `/rentals?customer=${customerData.customer_id}&action=generate_invoice`,
        actionText: 'Generate Invoice',
        scheduledFor: new Date().toISOString(), // Show immediately
        expiresAt: new Date(currentYear, 1, 28).toISOString() // Expires end of February
      };

      return await this.createNotification(notification);
    } catch (error) {
      console.error('Error creating yearly rental notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Subscribe to real-time notification updates
  static subscribeToNotifications(organizationId, callback) {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  }

  // Unsubscribe from real-time updates
  static unsubscribeFromNotifications(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }

  // Notification priority colors for UI
  static getPriorityColor(priority) {
    const colors = {
      low: '#00C851',      // Green
      normal: '#2196F3',   // Blue  
      high: '#FF9800',     // Orange
      urgent: '#F44336'    // Red
    };
    return colors[priority] || colors.normal;
  }

  // Notification type icons for UI
  static getTypeIcon(type) {
    const icons = {
      yearly_invoice: '📅',
      monthly_invoice: '📄',
      payment_due: '💳',
      system_alert: '⚠️',
      reminder: '🔔',
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  // Format notification time for display
  static formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  }
}

export default NotificationService;