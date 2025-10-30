import logger from '../utils/logger';
import { supabase } from '../supabase/client';

export const gdprService = {
  // Data export - Right to data portability
  async exportUserData(userId, organizationId) {
    try {
      logger.log('Starting GDPR data export for user:', userId);
      
      const exportData = {
        exportInfo: {
          userId,
          organizationId,
          exportDate: new Date().toISOString(),
          exportType: 'GDPR_DATA_EXPORT',
          version: '1.0'
        },
        userData: {},
        businessData: {}
      };

      // Export user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error('Error exporting profile data:', profileError);
      } else {
        exportData.userData.profile = profileData;
      }

      // Export user's audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (auditError) {
        logger.error('Error exporting audit data:', auditError);
      } else {
        exportData.userData.auditLogs = auditData;
      }

      // Export user's notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notificationError) {
        logger.error('Error exporting notification data:', notificationError);
      } else {
        exportData.userData.notifications = notificationData;
      }

      // Export user's support tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          messages:support_ticket_messages(*)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (ticketError) {
        logger.error('Error exporting support ticket data:', ticketError);
      } else {
        exportData.userData.supportTickets = ticketData;
      }

      // Export organization data (if user is admin/owner)
      if (profileData?.role === 'admin' || profileData?.role === 'owner') {
        // Export customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (customersError) {
          logger.error('Error exporting customers data:', customersError);
        } else {
          exportData.businessData.customers = customersData;
        }

        // Export bottles/cylinders
        const { data: bottlesData, error: bottlesError } = await supabase
          .from('bottles')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (bottlesError) {
          logger.error('Error exporting bottles data:', bottlesError);
        } else {
          exportData.businessData.bottles = bottlesData;
        }

        // Export rentals
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (rentalsError) {
          logger.error('Error exporting rentals data:', rentalsError);
        } else {
          exportData.businessData.rentals = rentalsData;
        }

        // Export invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            *,
            line_items:invoice_line_items(*)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (invoicesError) {
          logger.error('Error exporting invoices data:', invoicesError);
        } else {
          exportData.businessData.invoices = invoicesData;
        }

        // Export organization info
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();

        if (orgError) {
          logger.error('Error exporting organization data:', orgError);
        } else {
          exportData.businessData.organization = orgData;
        }
      }

      // Create audit log for data export
      await this.createAuditLog(userId, organizationId, 'DATA_EXPORT', {
        action: 'GDPR data export completed',
        exportSize: JSON.stringify(exportData).length,
        tablesExported: Object.keys(exportData.userData).concat(Object.keys(exportData.businessData))
      });

      return {
        success: true,
        data: exportData,
        message: 'Data export completed successfully'
      };

    } catch (error) {
      logger.error('GDPR data export failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Data export failed'
      };
    }
  },

  // Data deletion - Right to be forgotten
  async deleteUserData(userId, organizationId, deleteType = 'USER_ONLY') {
    try {
      logger.log('Starting GDPR data deletion for user:', userId, 'type:', deleteType);

      const deletionResults = {
        userId,
        organizationId,
        deleteType,
        deletionDate: new Date().toISOString(),
        deletedTables: [],
        retainedTables: [],
        errors: []
      };

      // Create audit log before deletion
      await this.createAuditLog(userId, organizationId, 'DATA_DELETION_START', {
        action: 'GDPR data deletion started',
        deleteType,
        timestamp: new Date().toISOString()
      });

      if (deleteType === 'USER_ONLY') {
        // Delete only user-specific data, keep business data
        await this.deleteUserSpecificData(userId, deletionResults);
      } else if (deleteType === 'FULL_ORGANIZATION') {
        // Delete entire organization and all associated data
        await this.deleteOrganizationData(organizationId, deletionResults);
      }

      // Create final audit log
      await this.createAuditLog(userId, organizationId, 'DATA_DELETION_COMPLETE', {
        action: 'GDPR data deletion completed',
        deletedTables: deletionResults.deletedTables,
        retainedTables: deletionResults.retainedTables,
        errors: deletionResults.errors
      });

      return {
        success: true,
        data: deletionResults,
        message: 'Data deletion completed successfully'
      };

    } catch (error) {
      logger.error('GDPR data deletion failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Data deletion failed'
      };
    }
  },

  async deleteUserSpecificData(userId, deletionResults) {
    // Delete user notifications
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      deletionResults.deletedTables.push('notifications');
    } catch (error) {
      deletionResults.errors.push(`Failed to delete notifications: ${error.message}`);
    }

    // Delete user support tickets and messages
    try {
      // Delete messages first (foreign key constraint)
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('created_by', userId);

      if (tickets && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);
        
        const { error: messagesError } = await supabase
          .from('support_ticket_messages')
          .delete()
          .in('ticket_id', ticketIds);

        if (messagesError) throw messagesError;

        const { error: ticketsError } = await supabase
          .from('support_tickets')
          .delete()
          .eq('created_by', userId);

        if (ticketsError) throw ticketsError;
      }

      deletionResults.deletedTables.push('support_tickets', 'support_ticket_messages');
    } catch (error) {
      deletionResults.errors.push(`Failed to delete support tickets: ${error.message}`);
    }

    // Anonymize audit logs (keep for compliance but remove personal data)
    try {
      const { error } = await supabase
        .from('audit_logs')
        .update({
          user_id: null,
          user_email: '[DELETED]',
          details: { action: 'User data anonymized for GDPR compliance' }
        })
        .eq('user_id', userId);

      if (error) throw error;
      deletionResults.deletedTables.push('audit_logs (anonymized)');
    } catch (error) {
      deletionResults.errors.push(`Failed to anonymize audit logs: ${error.message}`);
    }

    // Delete user profile (last step)
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      deletionResults.deletedTables.push('profiles');
    } catch (error) {
      deletionResults.errors.push(`Failed to delete profile: ${error.message}`);
    }

    // Business data is retained for legal/business purposes
    deletionResults.retainedTables.push(
      'customers (business requirement)',
      'bottles (business requirement)',
      'rentals (business requirement)',
      'invoices (legal requirement)',
      'organizations (business requirement)'
    );
  },

  async deleteOrganizationData(organizationId, deletionResults) {
    // This would delete ALL organization data
    // Only use for complete account closure
    
    const tables = [
      'notifications',
      'support_ticket_messages',
      'support_tickets',
      'invoice_line_items',
      'invoices',
      'rentals',
      'bottles',
      'customers',
      'audit_logs',
      'profiles',
      'organizations'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('organization_id', organizationId);

        if (error) throw error;
        deletionResults.deletedTables.push(table);
      } catch (error) {
        deletionResults.errors.push(`Failed to delete ${table}: ${error.message}`);
      }
    }
  },

  // Right to rectification - Update incorrect data
  async updateUserData(userId, updateData) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Create audit log
      await this.createAuditLog(userId, null, 'DATA_RECTIFICATION', {
        action: 'User data updated via GDPR rectification',
        updatedFields: Object.keys(updateData)
      });

      return {
        success: true,
        message: 'Data updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Data update failed'
      };
    }
  },

  // Data processing consent management
  async updateConsent(userId, consentData) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          consent_marketing: consentData.marketing || false,
          consent_analytics: consentData.analytics || false,
          consent_updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Create audit log
      await this.createAuditLog(userId, null, 'CONSENT_UPDATE', {
        action: 'User consent preferences updated',
        consentData
      });

      return {
        success: true,
        message: 'Consent preferences updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Consent update failed'
      };
    }
  },

  // Data portability - Export in machine-readable format
  async exportDataPortable(userId, organizationId, format = 'JSON') {
    try {
      const exportResult = await this.exportUserData(userId, organizationId);
      
      if (!exportResult.success) {
        return exportResult;
      }

      let formattedData;
      let mimeType;
      let filename;

      switch (format.toUpperCase()) {
        case 'JSON':
          formattedData = JSON.stringify(exportResult.data, null, 2);
          mimeType = 'application/json';
          filename = `gdpr-export-${userId}-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'CSV':
          formattedData = this.convertToCSV(exportResult.data);
          mimeType = 'text/csv';
          filename = `gdpr-export-${userId}-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'XML':
          formattedData = this.convertToXML(exportResult.data);
          mimeType = 'application/xml';
          filename = `gdpr-export-${userId}-${new Date().toISOString().split('T')[0]}.xml`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      return {
        success: true,
        data: formattedData,
        mimeType,
        filename,
        message: 'Data exported successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Data export failed'
      };
    }
  },

  // Helper method to create audit logs
  async createAuditLog(userId, organizationId, action, details) {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          action,
          details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to create audit log:', error);
    }
  },

  // Helper method to convert data to CSV
  convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    const rows = [];
    
    function flattenObject(obj, prefix = '') {
      const flattened = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(flattened, flattenObject(obj[key], newKey));
          } else {
            flattened[newKey] = obj[key];
          }
        }
      }
      return flattened;
    }

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened);
    rows.push(headers.join(','));
    rows.push(Object.values(flattened).map(v => `"${v}"`).join(','));

    return rows.join('\n');
  },

  // Helper method to convert data to XML
  convertToXML(data) {
    // Simple XML conversion - in production, use a proper XML library
    function objectToXML(obj, rootName = 'root') {
      let xml = `<${rootName}>`;
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            xml += objectToXML(obj[key], key);
          } else if (Array.isArray(obj[key])) {
            xml += `<${key}>`;
            obj[key].forEach(item => {
              xml += objectToXML(item, 'item');
            });
            xml += `</${key}>`;
          } else {
            xml += `<${key}>${obj[key]}</${key}>`;
          }
        }
      }
      
      xml += `</${rootName}>`;
      return xml;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n${objectToXML(data, 'gdpr-export')}`;
  }
}; 