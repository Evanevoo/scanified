import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Maintenance Scheduler Service
 * Handles automatic scheduling and execution of maintenance workflows
 */

export class MaintenanceScheduler {
  /**
   * Create a maintenance schedule
   */
  static async createSchedule(organizationId, scheduleData) {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .insert({
          organization_id: organizationId,
          workflow_id: scheduleData.workflowId,
          name: scheduleData.name,
          description: scheduleData.description,
          frequency_type: scheduleData.frequencyType, // daily, weekly, monthly, quarterly, yearly, custom
          frequency_value: scheduleData.frequencyValue, // e.g., 7 for "every 7 days"
          start_date: scheduleData.startDate,
          end_date: scheduleData.endDate,
          time_of_day: scheduleData.timeOfDay, // HH:MM format
          days_of_week: scheduleData.daysOfWeek, // [0-6] for Sunday-Saturday
          day_of_month: scheduleData.dayOfMonth, // 1-31
          assigned_to: scheduleData.assignedTo,
          notification_days_before: scheduleData.notificationDaysBefore || 1,
          auto_create_tasks: scheduleData.autoCreateTasks !== false,
          is_active: true,
          created_by: scheduleData.createdBy
        })
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Maintenance schedule created:', data.name);
      return data;

    } catch (error) {
      logger.error('❌ Error creating maintenance schedule:', error);
      throw error;
    }
  }

  /**
   * Get all schedules for an organization
   */
  static async getSchedules(organizationId, filters = {}) {
    try {
      let query = supabase
        .from('maintenance_schedules')
        .select(`
          *,
          maintenance_workflows(name, description, category, priority),
          profiles:assigned_to(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('is_active', filters.status === 'active');
      }

      if (filters.workflowId) {
        query = query.eq('workflow_id', filters.workflowId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;

    } catch (error) {
      logger.error('❌ Error fetching maintenance schedules:', error);
      throw error;
    }
  }

  /**
   * Get next scheduled occurrences for a schedule
   */
  static getNextOccurrences(schedule, count = 5) {
    const occurrences = [];
    const startDate = new Date(schedule.start_date);
    const now = new Date();
    let currentDate = startDate > now ? new Date(startDate) : new Date(now);

    for (let i = 0; i < count; i++) {
      const nextDate = this.calculateNextOccurrence(schedule, currentDate);
      
      if (!nextDate) break;
      if (schedule.end_date && nextDate > new Date(schedule.end_date)) break;

      occurrences.push(nextDate);
      currentDate = new Date(nextDate.getTime() + 1000); // Move to next second
    }

    return occurrences;
  }

  /**
   * Calculate the next occurrence based on schedule rules
   */
  static calculateNextOccurrence(schedule, fromDate) {
    const date = new Date(fromDate);
    
    switch (schedule.frequency_type) {
      case 'daily':
        date.setDate(date.getDate() + (schedule.frequency_value || 1));
        break;

      case 'weekly':
        // Move to next occurrence of the specified days of week
        const daysOfWeek = schedule.days_of_week || [date.getDay()];
        let daysToAdd = 1;
        
        while (daysToAdd < 7) {
          const nextDay = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          if (daysOfWeek.includes(nextDay.getDay())) {
            date.setTime(nextDay.getTime());
            break;
          }
          daysToAdd++;
        }
        
        if (daysToAdd >= 7) {
          // If no matching day found in this week, move to next week
          date.setDate(date.getDate() + 7);
        }
        break;

      case 'monthly':
        const targetDay = schedule.day_of_month || 1;
        date.setMonth(date.getMonth() + (schedule.frequency_value || 1));
        date.setDate(Math.min(targetDay, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
        break;

      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;

      case 'yearly':
        date.setFullYear(date.getFullYear() + (schedule.frequency_value || 1));
        break;

      case 'custom':
        // Custom frequency in days
        date.setDate(date.getDate() + (schedule.frequency_value || 1));
        break;

      default:
        return null;
    }

    // Set time of day if specified
    if (schedule.time_of_day) {
      const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }

    return date;
  }

  /**
   * Generate scheduled tasks for upcoming maintenance
   */
  static async generateScheduledTasks(organizationId, daysAhead = 30) {
    try {
      logger.log('🔄 Generating scheduled maintenance tasks...');
      
      // Get all active schedules
      const schedules = await this.getSchedules(organizationId, { status: 'active' });
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      let tasksCreated = 0;

      for (const schedule of schedules) {
        if (!schedule.auto_create_tasks) continue;

        const occurrences = this.getNextOccurrences(schedule, 10);

        for (const occurrence of occurrences) {
          if (occurrence > endDate) break;

          // Check if task already exists for this date
          const { data: existingTasks } = await supabase
            .from('maintenance_tasks')
            .select('id')
            .eq('schedule_id', schedule.id)
            .gte('scheduled_date', occurrence.toISOString().split('T')[0])
            .lt('scheduled_date', new Date(occurrence.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

          if (existingTasks && existingTasks.length > 0) {
            continue; // Task already exists
          }

          // Create the task
          const { error: insertError } = await supabase
            .from('maintenance_tasks')
            .insert({
              organization_id: organizationId,
              schedule_id: schedule.id,
              workflow_id: schedule.workflow_id,
              assigned_to: schedule.assigned_to,
              name: `${schedule.maintenance_workflows?.name || 'Maintenance'} - ${occurrence.toLocaleDateString()}`,
              description: schedule.description,
              status: 'scheduled',
              priority: schedule.maintenance_workflows?.priority || 'medium',
              scheduled_date: occurrence.toISOString(),
              due_date: occurrence.toISOString(),
              auto_generated: true
            });

          if (insertError) {
            logger.error('Error creating scheduled task:', insertError);
            continue;
          }

          tasksCreated++;

          // Send notification if within notification window
          const daysUntil = Math.ceil((occurrence - new Date()) / (24 * 60 * 60 * 1000));
          if (daysUntil <= schedule.notification_days_before && schedule.assigned_to) {
            await this.sendMaintenanceNotification(schedule, occurrence);
          }
        }
      }

      logger.log(`✅ Generated ${tasksCreated} scheduled maintenance tasks`);
      return tasksCreated;

    } catch (error) {
      logger.error('❌ Error generating scheduled tasks:', error);
      throw error;
    }
  }

  /**
   * Send notification for upcoming maintenance
   */
  static async sendMaintenanceNotification(schedule, dueDate) {
    try {
      // This would integrate with your notification service
      logger.log(`📧 Sending maintenance notification for: ${schedule.name}`);
      
      // Example: Create a notification record
      await supabase
        .from('notifications')
        .insert({
          organization_id: schedule.organization_id,
          user_id: schedule.assigned_to,
          type: 'maintenance_reminder',
          title: 'Upcoming Maintenance',
          message: `${schedule.name} is scheduled for ${dueDate.toLocaleDateString()}`,
          data: {
            schedule_id: schedule.id,
            workflow_id: schedule.workflow_id,
            due_date: dueDate.toISOString()
          },
          is_read: false
        });

    } catch (error) {
      logger.error('Error sending maintenance notification:', error);
    }
  }

  /**
   * Update a maintenance schedule
   */
  static async updateSchedule(scheduleId, updates) {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Maintenance schedule updated');
      return data;

    } catch (error) {
      logger.error('❌ Error updating maintenance schedule:', error);
      throw error;
    }
  }

  /**
   * Deactivate a maintenance schedule
   */
  static async deactivateSchedule(scheduleId) {
    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (error) throw error;

      logger.log('✅ Maintenance schedule deactivated');

    } catch (error) {
      logger.error('❌ Error deactivating maintenance schedule:', error);
      throw error;
    }
  }

  /**
   * Get maintenance schedule statistics
   */
  static async getScheduleStats(organizationId) {
    try {
      const { data: schedules } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('organization_id', organizationId);

      const { data: tasks } = await supabase
        .from('maintenance_tasks')
        .select('status, scheduled_date')
        .eq('organization_id', organizationId)
        .eq('auto_generated', true);

      const activeSchedules = schedules?.filter(s => s.is_active).length || 0;
      const totalSchedules = schedules?.length || 0;
      
      const upcomingTasks = tasks?.filter(t => 
        t.status === 'scheduled' && 
        new Date(t.scheduled_date) > new Date()
      ).length || 0;

      const overdueTasks = tasks?.filter(t => 
        t.status === 'scheduled' && 
        new Date(t.scheduled_date) < new Date()
      ).length || 0;

      return {
        activeSchedules,
        totalSchedules,
        upcomingTasks,
        overdueTasks
      };

    } catch (error) {
      logger.error('Error fetching schedule stats:', error);
      return {
        activeSchedules: 0,
        totalSchedules: 0,
        upcomingTasks: 0,
        overdueTasks: 0
      };
    }
  }
}

export default MaintenanceScheduler;

