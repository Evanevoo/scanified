/**
 * Automation Service
 * Handles automation rules, triggers, and workflow execution
 */

import { supabase } from '../supabase/client';

class AutomationService {
  constructor() {
    this.triggers = new Map();
    this.actions = new Map();
    this.isInitialized = false;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Register built-in triggers
      this.registerBuiltInTriggers();
      
      // Register built-in actions
      this.registerBuiltInActions();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Automation service initialized');
    } catch (error) {
      console.error('Failed to initialize automation service:', error);
      throw error;
    }
  }

  // =============================================================================
  // TRIGGER MANAGEMENT
  // =============================================================================

  registerBuiltInTriggers() {
    // Bottle triggers
    this.registerTrigger('bottle_created', {
      name: 'Bottle Created',
      description: 'Triggered when a new bottle is created',
      fields: ['id', 'serial_number', 'status', 'location', 'organization_id']
    });

    this.registerTrigger('bottle_updated', {
      name: 'Bottle Updated',
      description: 'Triggered when a bottle is updated',
      fields: ['id', 'serial_number', 'status', 'location', 'organization_id', 'changes']
    });

    this.registerTrigger('bottle_status_changed', {
      name: 'Bottle Status Changed',
      description: 'Triggered when a bottle status changes',
      fields: ['id', 'serial_number', 'old_status', 'new_status', 'organization_id']
    });

    // Rental triggers
    this.registerTrigger('rental_created', {
      name: 'Rental Created',
      description: 'Triggered when a new rental is created',
      fields: ['id', 'customer_id', 'bottle_id', 'rental_start_date', 'daily_rate', 'organization_id']
    });

    this.registerTrigger('rental_updated', {
      name: 'Rental Updated',
      description: 'Triggered when a rental is updated',
      fields: ['id', 'customer_id', 'bottle_id', 'status', 'organization_id', 'changes']
    });

    this.registerTrigger('rental_completed', {
      name: 'Rental Completed',
      description: 'Triggered when a rental is completed',
      fields: ['id', 'customer_id', 'bottle_id', 'rental_end_date', 'total_amount', 'organization_id']
    });

    this.registerTrigger('rental_overdue', {
      name: 'Rental Overdue',
      description: 'Triggered when a rental becomes overdue',
      fields: ['id', 'customer_id', 'bottle_id', 'overdue_days', 'amount_due', 'organization_id']
    });

    // Delivery triggers
    this.registerTrigger('delivery_scheduled', {
      name: 'Delivery Scheduled',
      description: 'Triggered when a delivery is scheduled',
      fields: ['id', 'customer_id', 'delivery_date', 'driver_id', 'organization_id']
    });

    this.registerTrigger('delivery_started', {
      name: 'Delivery Started',
      description: 'Triggered when a delivery starts',
      fields: ['id', 'customer_id', 'driver_id', 'started_at', 'organization_id']
    });

    this.registerTrigger('delivery_completed', {
      name: 'Delivery Completed',
      description: 'Triggered when a delivery is completed',
      fields: ['id', 'customer_id', 'driver_id', 'completed_at', 'signature', 'organization_id']
    });

    // Maintenance triggers
    this.registerTrigger('maintenance_due', {
      name: 'Maintenance Due',
      description: 'Triggered when maintenance is due',
      fields: ['id', 'bottle_id', 'maintenance_type', 'due_date', 'organization_id']
    });

    this.registerTrigger('maintenance_scheduled', {
      name: 'Maintenance Scheduled',
      description: 'Triggered when maintenance is scheduled',
      fields: ['id', 'bottle_id', 'maintenance_type', 'scheduled_date', 'technician_id', 'organization_id']
    });

    this.registerTrigger('maintenance_completed', {
      name: 'Maintenance Completed',
      description: 'Triggered when maintenance is completed',
      fields: ['id', 'bottle_id', 'maintenance_type', 'completed_date', 'technician_id', 'cost', 'organization_id']
    });

    // Customer triggers
    this.registerTrigger('customer_created', {
      name: 'Customer Created',
      description: 'Triggered when a new customer is created',
      fields: ['id', 'name', 'email', 'phone', 'customer_type', 'organization_id']
    });

    this.registerTrigger('customer_updated', {
      name: 'Customer Updated',
      description: 'Triggered when a customer is updated',
      fields: ['id', 'name', 'email', 'phone', 'organization_id', 'changes']
    });

    // Invoice triggers
    this.registerTrigger('invoice_created', {
      name: 'Invoice Created',
      description: 'Triggered when an invoice is created',
      fields: ['id', 'customer_id', 'invoice_number', 'total_amount', 'due_date', 'organization_id']
    });

    this.registerTrigger('invoice_overdue', {
      name: 'Invoice Overdue',
      description: 'Triggered when an invoice becomes overdue',
      fields: ['id', 'customer_id', 'invoice_number', 'overdue_days', 'amount_due', 'organization_id']
    });

    this.registerTrigger('payment_received', {
      name: 'Payment Received',
      description: 'Triggered when a payment is received',
      fields: ['id', 'customer_id', 'invoice_id', 'amount', 'payment_method', 'organization_id']
    });
  }

  registerTrigger(triggerId, config) {
    this.triggers.set(triggerId, {
      id: triggerId,
      ...config,
      registeredAt: new Date().toISOString()
    });
  }

  getTrigger(triggerId) {
    return this.triggers.get(triggerId);
  }

  getAllTriggers() {
    return Array.from(this.triggers.values());
  }

  // =============================================================================
  // ACTION MANAGEMENT
  // =============================================================================

  registerBuiltInActions() {
    // Email actions
    this.registerAction('send_email', {
      name: 'Send Email',
      description: 'Send an email notification',
      configFields: [
        { name: 'to', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'subject', type: 'string', required: true, description: 'Email subject' },
        { name: 'body', type: 'text', required: true, description: 'Email body' },
        { name: 'template', type: 'string', required: false, description: 'Email template ID' }
      ]
    });

    // SMS actions
    this.registerAction('send_sms', {
      name: 'Send SMS',
      description: 'Send an SMS notification',
      configFields: [
        { name: 'phoneNumber', type: 'string', required: true, description: 'Recipient phone number' },
        { name: 'message', type: 'text', required: true, description: 'SMS message' },
        { name: 'template', type: 'string', required: false, description: 'SMS template ID' }
      ]
    });

    // Task actions
    this.registerAction('create_task', {
      name: 'Create Task',
      description: 'Create a new task',
      configFields: [
        { name: 'title', type: 'string', required: true, description: 'Task title' },
        { name: 'description', type: 'text', required: false, description: 'Task description' },
        { name: 'assignedTo', type: 'string', required: false, description: 'User ID to assign task to' },
        { name: 'dueDate', type: 'date', required: false, description: 'Task due date' },
        { name: 'priority', type: 'string', required: false, description: 'Task priority' }
      ]
    });

    // Record update actions
    this.registerAction('update_record', {
      name: 'Update Record',
      description: 'Update a database record',
      configFields: [
        { name: 'table', type: 'string', required: true, description: 'Table name' },
        { name: 'recordId', type: 'string', required: true, description: 'Record ID' },
        { name: 'updates', type: 'json', required: true, description: 'Fields to update' }
      ]
    });

    // Webhook actions
    this.registerAction('trigger_webhook', {
      name: 'Trigger Webhook',
      description: 'Send data to a webhook URL',
      configFields: [
        { name: 'url', type: 'string', required: true, description: 'Webhook URL' },
        { name: 'method', type: 'string', required: false, description: 'HTTP method (POST, PUT, PATCH)' },
        { name: 'headers', type: 'json', required: false, description: 'Custom headers' },
        { name: 'data', type: 'json', required: false, description: 'Data to send' }
      ]
    });

    // Notification actions
    this.registerAction('send_notification', {
      name: 'Send Notification',
      description: 'Send a push notification',
      configFields: [
        { name: 'userId', type: 'string', required: true, description: 'User ID to notify' },
        { name: 'title', type: 'string', required: true, description: 'Notification title' },
        { name: 'body', type: 'text', required: true, description: 'Notification body' },
        { name: 'data', type: 'json', required: false, description: 'Additional data' }
      ]
    });

    // Delay actions
    this.registerAction('delay', {
      name: 'Delay',
      description: 'Wait for a specified amount of time',
      configFields: [
        { name: 'duration', type: 'number', required: true, description: 'Delay duration in seconds' },
        { name: 'unit', type: 'string', required: false, description: 'Time unit (seconds, minutes, hours, days)' }
      ]
    });

    // Conditional actions
    this.registerAction('conditional', {
      name: 'Conditional',
      description: 'Execute actions based on conditions',
      configFields: [
        { name: 'condition', type: 'json', required: true, description: 'Condition to evaluate' },
        { name: 'trueActions', type: 'json', required: false, description: 'Actions to execute if condition is true' },
        { name: 'falseActions', type: 'json', required: false, description: 'Actions to execute if condition is false' }
      ]
    });
  }

  registerAction(actionId, config) {
    this.actions.set(actionId, {
      id: actionId,
      ...config,
      registeredAt: new Date().toISOString()
    });
  }

  getAction(actionId) {
    return this.actions.get(actionId);
  }

  getAllActions() {
    return Array.from(this.actions.values());
  }

  // =============================================================================
  // EVENT LISTENERS
  // =============================================================================

  setupEventListeners() {
    // Listen to database changes
    supabase
      .channel('automation-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bottles'
      }, (payload) => {
        this.handleTrigger('bottle_created', payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bottles'
      }, (payload) => {
        this.handleTrigger('bottle_updated', payload.new, payload.old);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rentals'
      }, (payload) => {
        this.handleTrigger('rental_created', payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rentals'
      }, (payload) => {
        this.handleTrigger('rental_updated', payload.new, payload.old);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'deliveries'
      }, (payload) => {
        this.handleTrigger('delivery_scheduled', payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'deliveries'
      }, (payload) => {
        this.handleTrigger('delivery_updated', payload.new, payload.old);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'maintenance_records'
      }, (payload) => {
        this.handleTrigger('maintenance_scheduled', payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'maintenance_records'
      }, (payload) => {
        this.handleTrigger('maintenance_updated', payload.new, payload.old);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        this.handleTrigger('customer_created', payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        this.handleTrigger('customer_updated', payload.new, payload.old);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'invoices'
      }, (payload) => {
        this.handleTrigger('invoice_created', payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_records'
      }, (payload) => {
        this.handleTrigger('payment_received', payload.new);
      })
      .subscribe();
  }

  // =============================================================================
  // TRIGGER HANDLING
  // =============================================================================

  async handleTrigger(triggerId, newData, oldData = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const trigger = this.getTrigger(triggerId);
      if (!trigger) {
        console.warn(`Unknown trigger: ${triggerId}`);
        return;
      }

      // Get organization ID from the data
      const organizationId = newData.organization_id;
      if (!organizationId) {
        console.warn(`No organization ID found for trigger: ${triggerId}`);
        return;
      }

      // Get active automation rules for this trigger
      const { data: rules, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trigger', triggerId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching automation rules:', error);
        return;
      }

      if (!rules || rules.length === 0) {
        return; // No rules to execute
      }

      // Execute each rule
      for (const rule of rules) {
        await this.executeRule(rule, {
          trigger: triggerId,
          newData,
          oldData,
          organizationId
        });
      }
    } catch (error) {
      console.error(`Error handling trigger ${triggerId}:`, error);
    }
  }

  // =============================================================================
  // RULE EXECUTION
  // =============================================================================

  async executeRule(rule, context) {
    try {
      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, context);
      if (!conditionsMet) {
        console.log(`Rule ${rule.name}: Conditions not met`);
        return;
      }

      // Execute actions
      const results = [];
      for (const actionConfig of rule.actions) {
        try {
          const result = await this.executeAction(actionConfig, context);
          results.push({
            action: actionConfig.type,
            success: true,
            result
          });
        } catch (actionError) {
          console.error(`Action ${actionConfig.type} failed:`, actionError);
          results.push({
            action: actionConfig.type,
            success: false,
            error: actionError.message
          });
        }
      }

      // Update rule execution count
      await supabase
        .from('automation_rules')
        .update({
          execution_count: rule.execution_count + 1,
          last_executed: new Date().toISOString()
        })
        .eq('id', rule.id);

      // Log execution
      await supabase
        .from('automation_logs')
        .insert({
          rule_id: rule.id,
          trigger_event: context.trigger,
          context: context,
          conditions_met: true,
          actions_executed: rule.actions,
          results: results,
          executed_at: new Date().toISOString()
        });

      console.log(`Rule ${rule.name} executed successfully`);
    } catch (error) {
      console.error(`Error executing rule ${rule.name}:`, error);
      
      // Update error count
      await supabase
        .from('automation_rules')
        .update({
          error_count: rule.error_count + 1,
          last_error: error.message
        })
        .eq('id', rule.id);

      // Log error
      await supabase
        .from('automation_logs')
        .insert({
          rule_id: rule.id,
          trigger_event: context.trigger,
          context: context,
          conditions_met: false,
          actions_executed: [],
          results: [],
          error: error.message,
          executed_at: new Date().toISOString()
        });
    }
  }

  // =============================================================================
  // CONDITION EVALUATION
  // =============================================================================

  async evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always execute
    }

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      
      // Get the value from context
      const contextValue = this.getNestedValue(context, field);
      
      // Evaluate the condition
      const conditionMet = this.evaluateCondition(contextValue, operator, value);
      if (!conditionMet) {
        return false;
      }
    }
    
    return true;
  }

  evaluateCondition(contextValue, operator, expectedValue) {
    switch (operator) {
      case 'equals':
        return contextValue === expectedValue;
      case 'not_equals':
        return contextValue !== expectedValue;
      case 'greater_than':
        return Number(contextValue) > Number(expectedValue);
      case 'less_than':
        return Number(contextValue) < Number(expectedValue);
      case 'greater_than_or_equal':
        return Number(contextValue) >= Number(expectedValue);
      case 'less_than_or_equal':
        return Number(contextValue) <= Number(expectedValue);
      case 'contains':
        return String(contextValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(contextValue).includes(String(expectedValue));
      case 'starts_with':
        return String(contextValue).startsWith(String(expectedValue));
      case 'ends_with':
        return String(contextValue).endsWith(String(expectedValue));
      case 'is_empty':
        return !contextValue || String(contextValue).trim() === '';
      case 'is_not_empty':
        return contextValue && String(contextValue).trim() !== '';
      case 'is_null':
        return contextValue === null || contextValue === undefined;
      case 'is_not_null':
        return contextValue !== null && contextValue !== undefined;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  // =============================================================================
  // ACTION EXECUTION
  // =============================================================================

  async executeAction(actionConfig, context) {
    const { type, config } = actionConfig;
    const action = this.getAction(type);
    
    if (!action) {
      throw new Error(`Unknown action type: ${type}`);
    }

    switch (type) {
      case 'send_email':
        return await this.sendEmail(config, context);
      case 'send_sms':
        return await this.sendSMS(config, context);
      case 'create_task':
        return await this.createTask(config, context);
      case 'update_record':
        return await this.updateRecord(config, context);
      case 'trigger_webhook':
        return await this.triggerWebhook(config, context);
      case 'send_notification':
        return await this.sendNotification(config, context);
      case 'delay':
        return await this.delay(config, context);
      case 'conditional':
        return await this.executeConditional(config, context);
      default:
        throw new Error(`Action ${type} not implemented`);
    }
  }

  // =============================================================================
  // ACTION IMPLEMENTATIONS
  // =============================================================================

  async sendEmail(config, context) {
    const { to, subject, body, template } = config;
    
    // Replace variables in subject and body
    const processedSubject = this.replaceVariables(subject, context);
    const processedBody = this.replaceVariables(body, context);
    
    // If template is specified, use it
    if (template) {
      const { data: templateData, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', template)
        .single();
      
      if (error) {
        throw new Error(`Template not found: ${template}`);
      }
      
      // Use template subject and body
      const finalSubject = templateData.subject ? this.replaceVariables(templateData.subject, context) : processedSubject;
      const finalBody = this.replaceVariables(templateData.body, context);
      
      // Send email using your email service
      console.log('Sending email:', { to, subject: finalSubject, body: finalBody });
      return { success: true, messageId: 'email-' + Date.now() };
    }
    
    // Send email directly
    console.log('Sending email:', { to, subject: processedSubject, body: processedBody });
    return { success: true, messageId: 'email-' + Date.now() };
  }

  async sendSMS(config, context) {
    const { phoneNumber, message, template } = config;
    
    // Replace variables in message
    const processedMessage = this.replaceVariables(message, context);
    
    // If template is specified, use it
    if (template) {
      const { data: templateData, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', template)
        .single();
      
      if (error) {
        throw new Error(`Template not found: ${template}`);
      }
      
      const finalMessage = this.replaceVariables(templateData.body, context);
      
      // Send SMS using your SMS service
      console.log('Sending SMS:', { phoneNumber, message: finalMessage });
      return { success: true, messageId: 'sms-' + Date.now() };
    }
    
    // Send SMS directly
    console.log('Sending SMS:', { phoneNumber, message: processedMessage });
    return { success: true, messageId: 'sms-' + Date.now() };
  }

  async createTask(config, context) {
    const { title, description, assignedTo, dueDate, priority } = config;
    
    // Replace variables in title and description
    const processedTitle = this.replaceVariables(title, context);
    const processedDescription = description ? this.replaceVariables(description, context) : '';
    
    // Create task in database
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        organization_id: context.organizationId,
        title: processedTitle,
        description: processedDescription,
        assigned_to: assignedTo,
        due_date: dueDate,
        priority: priority || 'medium',
        status: 'pending',
        created_by: context.organizationId // This should be the current user ID
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
    
    return { success: true, taskId: data.id };
  }

  async updateRecord(config, context) {
    const { table, recordId, updates } = config;
    
    // Replace variables in updates
    const processedUpdates = this.replaceVariablesInObject(updates, context);
    
    // Update record in database
    const { data, error } = await supabase
      .from(table)
      .update(processedUpdates)
      .eq('id', recordId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update record: ${error.message}`);
    }
    
    return { success: true, record: data };
  }

  async triggerWebhook(config, context) {
    const { url, method = 'POST', headers = {}, data = {} } = config;
    
    // Replace variables in data
    const processedData = this.replaceVariablesInObject(data, context);
    
    // Send webhook
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(processedData)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    return { success: true, status: response.status };
  }

  async sendNotification(config, context) {
    const { userId, title, body, data = {} } = config;
    
    // Replace variables in title and body
    const processedTitle = this.replaceVariables(title, context);
    const processedBody = this.replaceVariables(body, context);
    
    // Send push notification
    console.log('Sending notification:', { userId, title: processedTitle, body: processedBody, data });
    return { success: true, notificationId: 'notification-' + Date.now() };
  }

  async delay(config, context) {
    const { duration, unit = 'seconds' } = config;
    
    // Convert duration to milliseconds
    let milliseconds = duration;
    switch (unit) {
      case 'minutes':
        milliseconds = duration * 60 * 1000;
        break;
      case 'hours':
        milliseconds = duration * 60 * 60 * 1000;
        break;
      case 'days':
        milliseconds = duration * 24 * 60 * 60 * 1000;
        break;
      default:
        milliseconds = duration * 1000;
    }
    
    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, milliseconds));
    
    return { success: true, delayed: milliseconds };
  }

  async executeConditional(config, context) {
    const { condition, trueActions, falseActions } = config;
    
    // Evaluate the condition
    const conditionMet = await this.evaluateConditions([condition], context);
    
    // Execute appropriate actions
    const actionsToExecute = conditionMet ? trueActions : falseActions;
    const results = [];
    
    if (actionsToExecute && actionsToExecute.length > 0) {
      for (const actionConfig of actionsToExecute) {
        try {
          const result = await this.executeAction(actionConfig, context);
          results.push({ action: actionConfig.type, success: true, result });
        } catch (actionError) {
          results.push({ action: actionConfig.type, success: false, error: actionError.message });
        }
      }
    }
    
    return { success: true, conditionMet, results };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  replaceVariables(text, context) {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = this.getNestedValue(context, variable.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  replaceVariablesInObject(obj, context) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.replaceVariables(value, context);
      } else if (typeof value === 'object') {
        result[key] = this.replaceVariablesInObject(value, context);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  async createRule(organizationId, ruleData) {
    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        organization_id: organizationId,
        ...ruleData
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create automation rule: ${error.message}`);
    }
    
    return data;
  }

  async updateRule(ruleId, updates) {
    const { data, error } = await supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update automation rule: ${error.message}`);
    }
    
    return data;
  }

  async deleteRule(ruleId) {
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', ruleId);
    
    if (error) {
      throw new Error(`Failed to delete automation rule: ${error.message}`);
    }
  }

  async getRules(organizationId) {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch automation rules: ${error.message}`);
    }
    
    return data;
  }

  async getRule(ruleId) {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', ruleId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch automation rule: ${error.message}`);
    }
    
    return data;
  }

  async getRuleLogs(ruleId, limit = 50) {
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('rule_id', ruleId)
      .order('executed_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch automation logs: ${error.message}`);
    }
    
    return data;
  }

  async testRule(ruleId, testContext) {
    const rule = await this.getRule(ruleId);
    return await this.executeRule(rule, testContext);
  }
}

// Export singleton instance
export const automationService = new AutomationService();
export default automationService;
