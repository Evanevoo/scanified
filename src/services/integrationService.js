import logger from '../utils/logger';
/**
 * Integration Service
 * Handles external system integrations including ERP, SMS, webhooks, and automation
 */

import { supabase } from '../supabase/client';

class IntegrationService {
  constructor() {
    this.integrations = new Map();
    this.webhooks = new Map();
    this.automationRules = new Map();
  }

  // =============================================================================
  // ERP INTEGRATIONS
  // =============================================================================

  /**
   * SAP Integration
   */
  async integrateWithSAP(organizationId, config) {
    try {
      const { sapUrl, username, password, clientId } = config;
      
      // Test connection
      const connectionTest = await this.testSAPConnection(sapUrl, username, password, clientId);
      if (!connectionTest.success) {
        throw new Error(`SAP connection failed: ${connectionTest.error}`);
      }

      // Save integration configuration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          organization_id: organizationId,
          type: 'sap',
          name: 'SAP ERP',
          config: {
            sapUrl,
            username,
            clientId,
            // Don't store password in plain text
            passwordEncrypted: await this.encryptPassword(password)
          },
          is_active: true,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Set up sync job
      await this.scheduleERPSync(organizationId, 'sap', data.id);

      return { success: true, integrationId: data.id };
    } catch (error) {
      logger.error('SAP integration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Oracle Integration
   */
  async integrateWithOracle(organizationId, config) {
    try {
      const { oracleUrl, username, password, serviceName } = config;
      
      // Test connection
      const connectionTest = await this.testOracleConnection(oracleUrl, username, password, serviceName);
      if (!connectionTest.success) {
        throw new Error(`Oracle connection failed: ${connectionTest.error}`);
      }

      // Save integration configuration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          organization_id: organizationId,
          type: 'oracle',
          name: 'Oracle ERP',
          config: {
            oracleUrl,
            username,
            serviceName,
            passwordEncrypted: await this.encryptPassword(password)
          },
          is_active: true,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Set up sync job
      await this.scheduleERPSync(organizationId, 'oracle', data.id);

      return { success: true, integrationId: data.id };
    } catch (error) {
      logger.error('Oracle integration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Microsoft Dynamics Integration
   */
  async integrateWithDynamics(organizationId, config) {
    try {
      const { dynamicsUrl, tenantId, clientId, clientSecret } = config;
      
      // Test connection
      const connectionTest = await this.testDynamicsConnection(dynamicsUrl, tenantId, clientId, clientSecret);
      if (!connectionTest.success) {
        throw new Error(`Dynamics connection failed: ${connectionTest.error}`);
      }

      // Save integration configuration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          organization_id: organizationId,
          type: 'dynamics',
          name: 'Microsoft Dynamics',
          config: {
            dynamicsUrl,
            tenantId,
            clientId,
            clientSecretEncrypted: await this.encryptPassword(clientSecret)
          },
          is_active: true,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Set up sync job
      await this.scheduleERPSync(organizationId, 'dynamics', data.id);

      return { success: true, integrationId: data.id };
    } catch (error) {
      logger.error('Dynamics integration error:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================================================
  // SMS INTEGRATIONS
  // =============================================================================

  /**
   * Twilio SMS Integration
   */
  async integrateWithTwilio(organizationId, config) {
    try {
      const { accountSid, authToken, phoneNumber } = config;
      
      // Test connection
      const connectionTest = await this.testTwilioConnection(accountSid, authToken);
      if (!connectionTest.success) {
        throw new Error(`Twilio connection failed: ${connectionTest.error}`);
      }

      // Save integration configuration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          organization_id: organizationId,
          type: 'twilio',
          name: 'Twilio SMS',
          config: {
            accountSid,
            phoneNumber,
            authTokenEncrypted: await this.encryptPassword(authToken)
          },
          is_active: true,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, integrationId: data.id };
    } catch (error) {
      logger.error('Twilio integration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(organizationId, phoneNumber, message) {
    try {
      // Get Twilio integration
      const { data: integration, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('organization_id', organizationId)
        .eq('type', 'twilio')
        .eq('is_active', true)
        .single();

      if (error || !integration) {
        throw new Error('Twilio integration not found');
      }

      const { accountSid, phoneNumber: fromNumber, authTokenEncrypted } = integration.config;
      const authToken = await this.decryptPassword(authTokenEncrypted);

      // Send SMS via Twilio API
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: phoneNumber,
          Body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`SMS send failed: ${errorData.message}`);
      }

      const result = await response.json();

      // Log SMS activity
      await supabase
        .from('sms_logs')
        .insert({
          organization_id: organizationId,
          phone_number: phoneNumber,
          message: message,
          status: 'sent',
          external_id: result.sid,
          sent_at: new Date().toISOString()
        });

      return { success: true, messageId: result.sid };
    } catch (error) {
      logger.error('SMS send error:', error);
      
      // Log failed SMS
      await supabase
        .from('sms_logs')
        .insert({
          organization_id: organizationId,
          phone_number: phoneNumber,
          message: message,
          status: 'failed',
          error: error.message,
          sent_at: new Date().toISOString()
        });

      return { success: false, error: error.message };
    }
  }

  // =============================================================================
  // WEBHOOK INTEGRATIONS
  // =============================================================================

  /**
   * Create Webhook
   */
  async createWebhook(organizationId, config) {
    try {
      const { name, url, events, secret, isActive = true } = config;
      
      // Validate webhook URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid webhook URL');
      }

      // Save webhook configuration
      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: organizationId,
          name,
          url,
          events: events || ['*'],
          secret: secret || await this.generateWebhookSecret(),
          is_active: isActive,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, webhookId: data.id };
    } catch (error) {
      logger.error('Webhook creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger Webhook
   */
  async triggerWebhook(organizationId, event, data) {
    try {
      // Get active webhooks for organization
      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;

      const results = [];

      for (const webhook of webhooks) {
        // Check if webhook listens to this event
        if (!webhook.events.includes('*') && !webhook.events.includes(event)) {
          continue;
        }

        try {
          // Prepare webhook payload
          const payload = {
            event,
            timestamp: new Date().toISOString(),
            data,
            organization_id: organizationId
          };

          // Create signature
          const signature = await this.createWebhookSignature(payload, webhook.secret);

          // Send webhook
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event,
              'User-Agent': 'GasCylinderApp-Webhook/1.0'
            },
            body: JSON.stringify(payload)
          });

          // Log webhook result
          await supabase
            .from('webhook_logs')
            .insert({
              webhook_id: webhook.id,
              event,
              status: response.ok ? 'success' : 'failed',
              response_code: response.status,
              response_body: await response.text(),
              sent_at: new Date().toISOString()
            });

          results.push({
            webhookId: webhook.id,
            success: response.ok,
            status: response.status
          });
        } catch (webhookError) {
          logger.error(`Webhook ${webhook.id} failed:`, webhookError);
          
          // Log failed webhook
          await supabase
            .from('webhook_logs')
            .insert({
              webhook_id: webhook.id,
              event,
              status: 'failed',
              error: webhookError.message,
              sent_at: new Date().toISOString()
            });

          results.push({
            webhookId: webhook.id,
            success: false,
            error: webhookError.message
          });
        }
      }

      return { success: true, results };
    } catch (error) {
      logger.error('Webhook trigger error:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================================================
  // AUTOMATION FEATURES
  // =============================================================================

  /**
   * Create Automation Rule
   */
  async createAutomationRule(organizationId, config) {
    try {
      const { name, trigger, conditions, actions, isActive = true } = config;
      
      // Validate automation rule
      if (!this.validateAutomationRule(config)) {
        throw new Error('Invalid automation rule configuration');
      }

      // Save automation rule
      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          organization_id: organizationId,
          name,
          trigger,
          conditions,
          actions,
          is_active: isActive,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, ruleId: data.id };
    } catch (error) {
      logger.error('Automation rule creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Automation Rule
   */
  async executeAutomationRule(ruleId, context) {
    try {
      // Get automation rule
      const { data: rule, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', ruleId)
        .eq('is_active', true)
        .single();

      if (error || !rule) {
        throw new Error('Automation rule not found');
      }

      // Check conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, context);
      if (!conditionsMet) {
        return { success: true, executed: false, reason: 'Conditions not met' };
      }

      // Execute actions
      const results = [];
      for (const action of rule.actions) {
        try {
          const result = await this.executeAction(action, context);
          results.push({ action: action.type, success: true, result });
        } catch (actionError) {
          logger.error(`Action ${action.type} failed:`, actionError);
          results.push({ action: action.type, success: false, error: actionError.message });
        }
      }

      // Log automation execution
      await supabase
        .from('automation_logs')
        .insert({
          rule_id: ruleId,
          context,
          results,
          executed_at: new Date().toISOString()
        });

      return { success: true, executed: true, results };
    } catch (error) {
      logger.error('Automation execution error:', error);
      return { success: false, error: error.message };
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Test SAP Connection
   */
  async testSAPConnection(sapUrl, username, password, clientId) {
    try {
      // Implement SAP connection test
      const response = await fetch(`${sapUrl}/sap/bc/rest/sap/sap/rest/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'X-SAP-Client': clientId
        }
      });

      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Oracle Connection
   */
  async testOracleConnection(oracleUrl, username, password, serviceName) {
    try {
      // Implement Oracle connection test
      const response = await fetch(`${oracleUrl}/ords/rest/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'X-Oracle-Service': serviceName
        }
      });

      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Dynamics Connection
   */
  async testDynamicsConnection(dynamicsUrl, tenantId, clientId, clientSecret) {
    try {
      // Get access token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Twilio Connection
   */
  async testTwilioConnection(accountSid, authToken) {
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
        }
      });

      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Encrypt Password
   */
  async encryptPassword(password) {
    // Implement password encryption
    return btoa(password); // Simple base64 encoding for demo
  }

  /**
   * Decrypt Password
   */
  async decryptPassword(encryptedPassword) {
    // Implement password decryption
    return atob(encryptedPassword); // Simple base64 decoding for demo
  }

  /**
   * Generate Webhook Secret
   */
  async generateWebhookSecret() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create Webhook Signature
   */
  async createWebhookSignature(payload, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(JSON.stringify(payload))
    );
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Validate URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Automation Rule
   */
  validateAutomationRule(config) {
    const { trigger, conditions, actions } = config;
    
    // Check required fields
    if (!trigger || !conditions || !actions) {
      return false;
    }
    
    // Validate trigger
    const validTriggers = ['bottle_created', 'bottle_updated', 'rental_created', 'delivery_scheduled'];
    if (!validTriggers.includes(trigger)) {
      return false;
    }
    
    // Validate conditions
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return false;
    }
    
    // Validate actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Evaluate Conditions
   */
  async evaluateConditions(conditions, context) {
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      
      const contextValue = this.getNestedValue(context, field);
      
      switch (operator) {
        case 'equals':
          if (contextValue !== value) return false;
          break;
        case 'not_equals':
          if (contextValue === value) return false;
          break;
        case 'greater_than':
          if (contextValue <= value) return false;
          break;
        case 'less_than':
          if (contextValue >= value) return false;
          break;
        case 'contains':
          if (!String(contextValue).includes(String(value))) return false;
          break;
        case 'not_contains':
          if (String(contextValue).includes(String(value))) return false;
          break;
        default:
          return false;
      }
    }
    
    return true;
  }

  /**
   * Execute Action
   */
  async executeAction(action, context) {
    switch (action.type) {
      case 'send_email':
        return await this.sendEmail(action.config, context);
      case 'send_sms':
        return await this.sendSMS(context.organization_id, action.config.phoneNumber, action.config.message);
      case 'create_task':
        return await this.createTask(action.config, context);
      case 'update_record':
        return await this.updateRecord(action.config, context);
      case 'trigger_webhook':
        return await this.triggerWebhook(context.organization_id, action.config.event, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Get Nested Value
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Schedule ERP Sync
   */
  async scheduleERPSync(organizationId, erpType, integrationId) {
    // Implement ERP sync scheduling
    logger.log(`Scheduling ${erpType} sync for organization ${organizationId}`);
  }

  /**
   * Send Email
   */
  async sendEmail(config, context) {
    // Implement email sending
    logger.log('Sending email:', config, context);
    return { success: true };
  }

  /**
   * Create Task
   */
  async createTask(config, context) {
    // Implement task creation
    logger.log('Creating task:', config, context);
    return { success: true };
  }

  /**
   * Update Record
   */
  async updateRecord(config, context) {
    // Implement record update
    logger.log('Updating record:', config, context);
    return { success: true };
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();
export default integrationService;
