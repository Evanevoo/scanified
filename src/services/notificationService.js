import { supabase } from '../supabase/client';

export const notificationService = {
  // Send email notification
  async sendEmail(to, subject, template, data = {}) {
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          template,
          data
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  // Send SMS notification
  async sendSMS(to, message) {
    try {
      const response = await fetch('/.netlify/functions/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          message
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  },

  // Create in-app notification
  async createInAppNotification(userId, title, message, type = 'info', data = {}) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          type,
          data,
          read: false,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get user notifications
  async getUserNotifications(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  // Send order notification
  async sendOrderNotification(order, organization) {
    try {
      // Send email to customer
      await this.sendEmail(
        order.customer_email,
        `Order #${order.id} Confirmed`,
        'order-confirmation',
        {
          orderId: order.id,
          customerName: order.customer_name,
          deliveryDate: order.delivery_date,
          items: order.items
        }
      );

      // Send SMS to customer
      await this.sendSMS(
        order.customer_phone,
        `Your order #${order.id} has been confirmed. Delivery scheduled for ${order.delivery_date}.`
      );

      // Create in-app notification for admin
      await this.createInAppNotification(
        organization.admin_id,
        'New Order Received',
        `Order #${order.id} from ${order.customer_name}`,
        'success',
        { orderId: order.id }
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending order notification:', error);
      throw error;
    }
  },

  // Send delivery notification
  async sendDeliveryNotification(delivery, organization) {
    try {
      // Send email to customer
      await this.sendEmail(
        delivery.customer_email,
        `Delivery #${delivery.id} Status Update`,
        'delivery-update',
        {
          deliveryId: delivery.id,
          customerName: delivery.customer_name,
          status: delivery.status,
          estimatedTime: delivery.estimated_time
        }
      );

      // Send SMS to customer
      await this.sendSMS(
        delivery.customer_phone,
        `Your delivery #${delivery.id} is ${delivery.status}. ETA: ${delivery.estimated_time}.`
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending delivery notification:', error);
      throw error;
    }
  },

  // Send payment reminder
  async sendPaymentReminder(invoice, organization) {
    try {
      // Send email reminder
      await this.sendEmail(
        invoice.customer_email,
        `Payment Reminder - Invoice #${invoice.invoice_number}`,
        'payment-reminder',
        {
          invoiceNumber: invoice.invoice_number,
          amount: invoice.total,
          dueDate: invoice.due_date,
          customerName: invoice.customer_name
        }
      );

      // Send SMS reminder
      await this.sendSMS(
        invoice.customer_phone,
        `Payment reminder: Invoice #${invoice.invoice_number} for $${invoice.total} is due on ${invoice.due_date}.`
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      throw error;
    }
  },

  // Send trial expiration warning
  async sendTrialExpirationWarning(organization) {
    try {
      const daysLeft = Math.ceil((new Date(organization.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24));

      // Send email warning
      await this.sendEmail(
        organization.admin_email,
        `Trial Expires in ${daysLeft} Days`,
        'trial-expiration',
        {
          organizationName: organization.name,
          daysLeft,
          trialEndDate: organization.trial_end_date
        }
      );

      // Create in-app notification
      await this.createInAppNotification(
        organization.admin_id,
        'Trial Expiration Warning',
        `Your trial expires in ${daysLeft} days. Add payment information to continue.`,
        'warning',
        { daysLeft }
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending trial expiration warning:', error);
      throw error;
    }
  },

  // Send payment failure notification
  async sendPaymentFailureNotification(organization, paymentAttempt) {
    try {
      const message = `Payment failed for ${organization.name}. Please update your payment method to avoid service interruption.`;

      // Send email notification
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          'Payment Failed - Action Required',
          'payment-failure',
          {
            organizationName: organization.name,
            paymentAttempt,
            failureReason: paymentAttempt.failure_reason || 'Unknown error'
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Payment Failed',
          message,
          'error',
          { paymentAttempt }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending payment failure notification:', error);
      throw error;
    }
  },

  // Send payment success notification
  async sendPaymentSuccessNotification(organization, payment) {
    try {
      const message = `Payment successful for ${organization.name}. Thank you for your business!`;

      // Send email receipt
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          'Payment Successful',
          'payment-success',
          {
            organizationName: organization.name,
            amount: payment.amount,
            date: payment.created
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Payment Successful',
          message,
          'success',
          { payment }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending payment success notification:', error);
      throw error;
    }
  },

  // Send plan upgrade notification
  async sendPlanUpgradeNotification(organization, oldPlan, newPlan) {
    try {
      const message = `Your plan has been upgraded from ${oldPlan} to ${newPlan}.`;

      // Send email confirmation
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          'Plan Upgraded Successfully',
          'plan-upgrade',
          {
            organizationName: organization.name,
            oldPlan,
            newPlan,
            upgradeDate: new Date().toISOString()
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Plan Upgraded',
          message,
          'success',
          { oldPlan, newPlan }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending plan upgrade notification:', error);
      throw error;
    }
  },

  // Send plan downgrade notification
  async sendPlanDowngradeNotification(organization, oldPlan, newPlan) {
    try {
      const message = `Your plan has been changed from ${oldPlan} to ${newPlan}. Changes will take effect at the end of your current billing cycle.`;

      // Send email confirmation
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          'Plan Changed',
          'plan-downgrade',
          {
            organizationName: organization.name,
            oldPlan,
            newPlan,
            changeDate: new Date().toISOString()
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Plan Changed',
          message,
          'info',
          { oldPlan, newPlan }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending plan downgrade notification:', error);
      throw error;
    }
  },

  // Send subscription cancellation notification
  async sendSubscriptionCancellationNotification(organization) {
    try {
      const message = `Your subscription has been cancelled. You can continue using the service until the end of your current billing period.`;

      // Send email notification
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          'Subscription Cancelled',
          'subscription-cancelled',
          {
            organizationName: organization.name,
            cancellationDate: new Date().toISOString()
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Subscription Cancelled',
          message,
          'warning',
          { cancellationDate: new Date().toISOString() }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending subscription cancellation notification:', error);
      throw error;
    }
  },

  // Send welcome notification for new organizations
  async sendWelcomeNotification(organization) {
    try {
      const message = `Welcome to Gas Cylinder Management! Your ${organization.subscription_plan} plan is now active.`;

      // Send welcome email
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          'Welcome to Gas Cylinder Management',
          'welcome',
          {
            organizationName: organization.name,
            plan: organization.subscription_plan,
            trialEndDate: organization.trial_end_date
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Welcome!',
          message,
          'success',
          { plan: organization.subscription_plan }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending welcome notification:', error);
      throw error;
    }
  },

  // Send usage limit approaching notification
  async sendUsageLimitNotification(organization, resource, currentUsage, maxUsage, percentage) {
    try {
      const message = `Your ${resource} usage is at ${percentage}% (${currentUsage}/${maxUsage}). Consider upgrading your plan to avoid service interruption.`;

      // Send email notification
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          `Usage Alert: ${resource.charAt(0).toUpperCase() + resource.slice(1)} at ${percentage}%`,
          'usage-alert',
          {
            organizationName: organization.name,
            resource,
            currentUsage,
            maxUsage,
            percentage
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          `Usage Alert: ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
          message,
          percentage >= 95 ? 'error' : 'warning',
          { resource, currentUsage, maxUsage, percentage }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending usage limit notification:', error);
      throw error;
    }
  },

  // Send dunning notification (payment retry)
  async sendDunningNotification(organization, attemptNumber, nextRetryDate) {
    try {
      const message = `Payment attempt ${attemptNumber} failed. We'll retry on ${nextRetryDate}. Please update your payment method.`;

      // Send email notification
      if (organization.admin_email) {
        await this.sendEmail(
          organization.admin_email,
          `Payment Retry - Attempt ${attemptNumber}`,
          'dunning-notification',
          {
            organizationName: organization.name,
            attemptNumber,
            nextRetryDate
          }
        );
      }

      // Create in-app notification
      if (organization.admin_id) {
        await this.createInAppNotification(
          organization.admin_id,
          'Payment Retry Scheduled',
          message,
          'warning',
          { attemptNumber, nextRetryDate }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending dunning notification:', error);
      throw error;
    }
  },

  // Get notification preferences for an organization
  async getNotificationPreferences(organizationId) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return data || {
        email_notifications: true,
        in_app_notifications: true,
        trial_warnings: true,
        payment_alerts: true,
        usage_alerts: true,
        marketing_emails: false
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  },

  // Update notification preferences
  async updateNotificationPreferences(organizationId, preferences) {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          organization_id: organizationId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  // Get unread notification count
  async getUnreadNotificationCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  },

  // Get recent notifications
  async getRecentNotifications(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent notifications:', error);
      return [];
    }
  },

  // Send maintenance reminder
  async sendMaintenanceReminder(bottle, organization) {
    try {
      // Send email to admin
      await this.sendEmail(
        organization.admin_email,
        `Maintenance Due - Bottle ${bottle.bottle_id}`,
        'maintenance-reminder',
        {
          bottleId: bottle.bottle_id,
          lastMaintenance: bottle.last_maintenance_date,
          nextMaintenance: bottle.next_maintenance_date
        }
      );

      // Create in-app notification
      await this.createInAppNotification(
        organization.admin_id,
        'Maintenance Due',
        `Bottle ${bottle.bottle_id} requires maintenance`,
        'warning',
        { bottleId: bottle.bottle_id }
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending maintenance reminder:', error);
      throw error;
    }
  },

  // Create a new notification
  async createNotification(notification) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications for a user
  async getNotifications(userId, organizationId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},organization_id.eq.${organizationId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId, organizationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .or(`user_id.eq.${userId},organization_id.eq.${organizationId}`)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Get unread notification count
  async getUnreadCount(userId, organizationId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},organization_id.eq.${organizationId}`)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Support ticket specific notifications
  async createSupportTicketNotification(ticket, type, recipientUserId = null, recipientOrgId = null) {
    const notification = {
      type: 'support_ticket',
      title: '',
      message: '',
      data: {
        ticket_id: ticket.id,
        ticket_subject: ticket.subject,
        ticket_status: ticket.status
      },
      read: false,
      created_at: new Date().toISOString()
    };

    // Set notification content based on type
    switch (type) {
      case 'new_ticket':
        notification.title = 'New Support Ticket';
        notification.message = `New ticket: "${ticket.subject}"`;
        notification.data.action = 'new_ticket';
        break;
      
      case 'ticket_reply':
        notification.title = 'Support Ticket Reply';
        notification.message = `New reply to ticket: "${ticket.subject}"`;
        notification.data.action = 'ticket_reply';
        break;
      
      case 'ticket_status_change':
        notification.title = 'Support Ticket Updated';
        notification.message = `Ticket "${ticket.subject}" status changed to ${ticket.status}`;
        notification.data.action = 'status_change';
        break;
      
      default:
        notification.title = 'Support Ticket Update';
        notification.message = `Update for ticket: "${ticket.subject}"`;
        notification.data.action = 'update';
    }

    // Set recipient
    if (recipientUserId) {
      notification.user_id = recipientUserId;
    }
    if (recipientOrgId) {
      notification.organization_id = recipientOrgId;
    }

    return this.createNotification(notification);
  },

  // Create notification for new ticket (notify owner)
  async notifyOwnerOfNewTicket(ticket) {
    try {
      // Get all owners
      const { data: owners, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'owner');

      if (error) throw error;

      // Create notifications for all owners
      const notifications = owners.map(owner => ({
        type: 'support_ticket',
        title: 'New Support Ticket',
        message: `New ticket from organization: "${ticket.subject}"`,
        user_id: owner.id,
        data: {
          ticket_id: ticket.id,
          ticket_subject: ticket.subject,
          ticket_status: ticket.status,
          action: 'new_ticket'
        },
        read: false,
        created_at: new Date().toISOString()
      }));

      // Insert all notifications
      if (notifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (insertError) throw insertError;
      }

      // Send email notifications to all owners
      if (owners.length > 0) {
        // Get organization details
        const { data: organization } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', ticket.organization_id)
          .single();

        // Get user details who submitted the ticket
        const { data: user } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', ticket.user_id)
          .single();

        // Get the base URL for the application
        const getBaseUrl = () => {
          if (typeof window !== 'undefined') {
            return window.location.origin;
          }
          // Fallback for server-side rendering or when window is not available
          return process.env.REACT_APP_BASE_URL || process.env.VITE_BASE_URL || 'https://scanified.netlify.app';
        };

        const ticketData = {
          subject: ticket.subject,
          category: ticket.category || 'General',
          priority: ticket.priority || 'Medium',
          description: ticket.description,
          organizationName: organization?.name || 'Unknown Organization',
          submittedBy: user?.full_name || user?.email || 'Unknown User',
          submittedDate: new Date(ticket.created_at).toLocaleString(),
          ticketUrl: `${getBaseUrl()}/owner-portal/support?ticket=${ticket.id}`
        };

        // Send email to each owner
        for (const owner of owners) {
          try {
            await this.sendEmail(
              owner.email,
              `New Support Ticket: ${ticket.subject}`,
              'support-ticket',
              ticketData
            );
          } catch (emailError) {
            console.error(`Error sending email to owner ${owner.email}:`, emailError);
            // Continue with other owners even if one fails
          }
        }
      }
    } catch (error) {
      console.error('Error notifying owner of new ticket:', error);
    }
  },

  // Create notification for ticket reply (notify ticket creator)
  async notifyUserOfTicketReply(ticket, replyMessage) {
    try {
      const notification = {
        type: 'support_ticket',
        title: 'Support Ticket Reply',
        message: `New reply to your ticket: "${ticket.subject}"`,
        user_id: ticket.user_id,
        data: {
          ticket_id: ticket.id,
          ticket_subject: ticket.subject,
          ticket_status: ticket.status,
          action: 'ticket_reply',
          reply_preview: replyMessage.substring(0, 100) + (replyMessage.length > 100 ? '...' : '')
        },
        read: false,
        created_at: new Date().toISOString()
      };

      return this.createNotification(notification);
    } catch (error) {
      console.error('Error notifying user of ticket reply:', error);
    }
  }
}; 