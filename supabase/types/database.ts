export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          app_store_url: string | null
          build_number: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          platform: string
          play_store_url: string | null
          release_notes: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          app_store_url?: string | null
          build_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          platform: string
          play_store_url?: string | null
          release_notes?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          app_store_url?: string | null
          build_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          platform?: string
          play_store_url?: string | null
          release_notes?: string | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      asset_classification_nodes: {
        Row: {
          created_at: string
          default_monthly_price: number | null
          default_yearly_price: number | null
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_monthly_price?: number | null
          default_yearly_price?: number | null
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_monthly_price?: number | null
          default_yearly_price?: number | null
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_classification_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "asset_classification_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_customer_relationships: {
        Row: {
          asset_identifier: string | null
          customer_identifier: string | null
          end_date: string | null
          extra: Json | null
          id: number
          raw_asset: string | null
          raw_customer: string | null
          relationship_type: string | null
          start_date: string | null
        }
        Insert: {
          asset_identifier?: string | null
          customer_identifier?: string | null
          end_date?: string | null
          extra?: Json | null
          id?: number
          raw_asset?: string | null
          raw_customer?: string | null
          relationship_type?: string | null
          start_date?: string | null
        }
        Update: {
          asset_identifier?: string | null
          customer_identifier?: string | null
          end_date?: string | null
          extra?: Json | null
          id?: number
          raw_asset?: string | null
          raw_customer?: string | null
          relationship_type?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      asset_exceptions: {
        Row: {
          asset_barcode: string | null
          asset_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          exception_type: string
          id: string
          metadata: Json | null
          order_number: string | null
          organization_id: string
          resolution_note: string | null
          resolution_status: string
          resolved_at: string | null
          resolved_by: string | null
          transaction_id: string | null
          transaction_type: string | null
        }
        Insert: {
          asset_barcode?: string | null
          asset_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          exception_type: string
          id?: string
          metadata?: Json | null
          order_number?: string | null
          organization_id: string
          resolution_note?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
        }
        Update: {
          asset_barcode?: string | null
          asset_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          exception_type?: string
          id?: string
          metadata?: Json | null
          order_number?: string | null
          organization_id?: string
          resolution_note?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_exceptions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_exceptions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_exceptions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "asset_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_records: {
        Row: {
          asset_id: string | null
          created_at: string
          customer_id: string | null
          customer_uuid: string | null
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          details: Json | null
          event_date: string
          event_type: string
          id: number
          notes: string | null
          organization_id: string | null
          performed_by: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_uuid?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          details?: Json | null
          event_date?: string
          event_type: string
          id?: number
          notes?: string | null
          organization_id?: string | null
          performed_by?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_uuid?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          details?: Json | null
          event_date?: string
          event_type?: string
          id?: number
          notes?: string | null
          organization_id?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_records_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_records_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_type_pricing: {
        Row: {
          category: string | null
          classification_node_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          monthly_price: number
          organization_id: string
          product_code: string | null
          updated_at: string | null
          yearly_price: number
        }
        Insert: {
          category?: string | null
          classification_node_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          organization_id: string
          product_code?: string | null
          updated_at?: string | null
          yearly_price?: number
        }
        Update: {
          category?: string | null
          classification_node_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          organization_id?: string
          product_code?: string | null
          updated_at?: string | null
          yearly_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_type_pricing_classification_node_id_fkey"
            columns: ["classification_node_id"]
            isOneToOne: false
            referencedRelation: "asset_classification_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "asset_type_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          dock_stock: string | null
          group_name: string | null
          id: string
          in_house_total: number | null
          lost_total: number | null
          product_code: string | null
          total: number | null
          type: string | null
          with_customer_total: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          dock_stock?: string | null
          group_name?: string | null
          id?: string
          in_house_total?: number | null
          lost_total?: number | null
          product_code?: string | null
          total?: number | null
          type?: string | null
          with_customer_total?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          dock_stock?: string | null
          group_name?: string | null
          id?: string
          in_house_total?: number | null
          lost_total?: number | null
          product_code?: string | null
          total?: number | null
          type?: string | null
          with_customer_total?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          import_id: string | null
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          timestamp: string | null
          user_id: string | null
          warning: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          import_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          timestamp?: string | null
          user_id?: string | null
          warning?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          import_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          timestamp?: string | null
          user_id?: string | null
          warning?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          context: Json
          executed_at: string
          id: string
          results: Json
          rule_id: string
        }
        Insert: {
          context?: Json
          executed_at?: string
          id?: string
          results?: Json
          rule_id: string
        }
        Update: {
          context?: Json
          executed_at?: string
          id?: string
          results?: Json
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          trigger: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          backup_size: number | null
          backup_type: string
          completed_at: string | null
          created_at: string | null
          errors: Json | null
          id: string
          metadata: Json | null
          records_backed_up: number | null
          started_at: string
          status: string
          tables_count: number | null
          updated_at: string | null
        }
        Insert: {
          backup_size?: number | null
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          records_backed_up?: number | null
          started_at: string
          status?: string
          tables_count?: number | null
          updated_at?: string | null
        }
        Update: {
          backup_size?: number | null
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          records_backed_up?: number | null
          started_at?: string
          status?: string
          tables_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          organization_id: string | null
          schedule_time: string | null
          schedule_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string | null
          schedule_time?: string | null
          schedule_type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string | null
          schedule_time?: string | null
          schedule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "backup_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_automation_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          details: Json | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          items_failed: number | null
          items_processed: number | null
          items_successful: number | null
          organization_id: string | null
          run_date: string | null
          run_type: string
          started_at: string | null
          status: string
          total_amount: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_successful?: number | null
          organization_id?: string | null
          run_date?: string | null
          run_type: string
          started_at?: string | null
          status?: string
          total_amount?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_successful?: number | null
          organization_id?: string | null
          run_date?: string | null
          run_type?: string
          started_at?: string | null
          status?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_automation_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_automation_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_automation_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_automation_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_automation_settings: {
        Row: {
          auto_generate_monthly: boolean | null
          auto_process_payments: boolean | null
          auto_send_emails: boolean | null
          auto_send_reminders: boolean | null
          created_at: string | null
          generation_day: number | null
          generation_time: string | null
          id: string
          invoice_email_template: string | null
          late_fee_amount: number | null
          late_fee_enabled: boolean | null
          late_fee_percentage: number | null
          notification_email: string | null
          notify_on_failure: boolean | null
          notify_on_generation: boolean | null
          notify_on_payment: boolean | null
          organization_id: string | null
          overdue_email_template: string | null
          payment_processor: string | null
          payment_terms_days: number | null
          reminder_days: number[] | null
          reminder_email_template: string | null
          updated_at: string | null
        }
        Insert: {
          auto_generate_monthly?: boolean | null
          auto_process_payments?: boolean | null
          auto_send_emails?: boolean | null
          auto_send_reminders?: boolean | null
          created_at?: string | null
          generation_day?: number | null
          generation_time?: string | null
          id?: string
          invoice_email_template?: string | null
          late_fee_amount?: number | null
          late_fee_enabled?: boolean | null
          late_fee_percentage?: number | null
          notification_email?: string | null
          notify_on_failure?: boolean | null
          notify_on_generation?: boolean | null
          notify_on_payment?: boolean | null
          organization_id?: string | null
          overdue_email_template?: string | null
          payment_processor?: string | null
          payment_terms_days?: number | null
          reminder_days?: number[] | null
          reminder_email_template?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_generate_monthly?: boolean | null
          auto_process_payments?: boolean | null
          auto_send_emails?: boolean | null
          auto_send_reminders?: boolean | null
          created_at?: string | null
          generation_day?: number | null
          generation_time?: string | null
          id?: string
          invoice_email_template?: string | null
          late_fee_amount?: number | null
          late_fee_enabled?: boolean | null
          late_fee_percentage?: number | null
          notification_email?: string | null
          notify_on_failure?: boolean | null
          notify_on_generation?: boolean | null
          notify_on_payment?: boolean | null
          organization_id?: string | null
          overdue_email_template?: string | null
          payment_processor?: string | null
          payment_terms_days?: number | null
          reminder_days?: number[] | null
          reminder_email_template?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_automation_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_automation_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_automation_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_automation_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bottle_scans: {
        Row: {
          bottle_barcode: string
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_uuid: string | null
          id: number
          location: string | null
          mode: string | null
          order_number: string | null
          organization_id: string | null
          read: boolean | null
          scan_accuracy_m: number | null
          scan_latitude: number | null
          scan_location_at: string | null
          scan_longitude: number | null
          timestamp: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          bottle_barcode: string
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_uuid?: string | null
          id?: number
          location?: string | null
          mode?: string | null
          order_number?: string | null
          organization_id?: string | null
          read?: boolean | null
          scan_accuracy_m?: number | null
          scan_latitude?: number | null
          scan_location_at?: string | null
          scan_longitude?: number | null
          timestamp?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          bottle_barcode?: string
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_uuid?: string | null
          id?: number
          location?: string | null
          mode?: string | null
          order_number?: string | null
          organization_id?: string | null
          read?: boolean | null
          scan_accuracy_m?: number | null
          scan_latitude?: number | null
          scan_location_at?: string | null
          scan_longitude?: number | null
          timestamp?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bottle_scans_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bottle_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bottles: {
        Row: {
          assigned_customer: string | null
          barcode_number: string | null
          category: string | null
          classification_node_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_uuid: string | null
          CustomerListID: string | null
          days_at_location: number | null
          description: string | null
          dock_stock: string | null
          gas_type: string | null
          group_name: string | null
          id: string
          in_house_total: number | null
          last_location_update: string | null
          last_verified_order: string | null
          location: string | null
          lost_total: number | null
          organization_id: string
          owner_id: string | null
          owner_name: string | null
          owner_type: string | null
          ownership: string | null
          previous_assigned_customer: string | null
          previous_status: string | null
          product_code: string | null
          rental_start_date: string | null
          serial_number: string | null
          status: string | null
          total: number | null
          type: string | null
          updated_at: string | null
          with_customer_total: number | null
        }
        Insert: {
          assigned_customer?: string | null
          barcode_number?: string | null
          category?: string | null
          classification_node_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_uuid?: string | null
          CustomerListID?: string | null
          days_at_location?: number | null
          description?: string | null
          dock_stock?: string | null
          gas_type?: string | null
          group_name?: string | null
          id?: string
          in_house_total?: number | null
          last_location_update?: string | null
          last_verified_order?: string | null
          location?: string | null
          lost_total?: number | null
          organization_id: string
          owner_id?: string | null
          owner_name?: string | null
          owner_type?: string | null
          ownership?: string | null
          previous_assigned_customer?: string | null
          previous_status?: string | null
          product_code?: string | null
          rental_start_date?: string | null
          serial_number?: string | null
          status?: string | null
          total?: number | null
          type?: string | null
          updated_at?: string | null
          with_customer_total?: number | null
        }
        Update: {
          assigned_customer?: string | null
          barcode_number?: string | null
          category?: string | null
          classification_node_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_uuid?: string | null
          CustomerListID?: string | null
          days_at_location?: number | null
          description?: string | null
          dock_stock?: string | null
          gas_type?: string | null
          group_name?: string | null
          id?: string
          in_house_total?: number | null
          last_location_update?: string | null
          last_verified_order?: string | null
          location?: string | null
          lost_total?: number | null
          organization_id?: string
          owner_id?: string | null
          owner_name?: string | null
          owner_type?: string | null
          ownership?: string | null
          previous_assigned_customer?: string | null
          previous_status?: string | null
          product_code?: string | null
          rental_start_date?: string | null
          serial_number?: string | null
          status?: string | null
          total?: number | null
          type?: string | null
          updated_at?: string | null
          with_customer_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bottles_assigned_customer_fkey"
            columns: ["assigned_customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["CustomerListID"]
          },
          {
            foreignKeyName: "bottles_classification_node_id_fkey"
            columns: ["classification_node_id"]
            isOneToOne: false
            referencedRelation: "asset_classification_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottles_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_rate_details: {
        Row: {
          bracket_rate_id: string
          created_at: string | null
          id: string
          max_days: number
          min_days: number
          order_index: number
          rate: number
          rate_type: string
        }
        Insert: {
          bracket_rate_id: string
          created_at?: string | null
          id?: string
          max_days?: number
          min_days?: number
          order_index?: number
          rate?: number
          rate_type?: string
        }
        Update: {
          bracket_rate_id?: string
          created_at?: string | null
          id?: string
          max_days?: number
          min_days?: number
          order_index?: number
          rate?: number
          rate_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_rate_details_bracket_rate_id_fkey"
            columns: ["bracket_rate_id"]
            isOneToOne: false
            referencedRelation: "bracket_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_rates: {
        Row: {
          created_at: string | null
          created_by: string
          currency: string
          effective_date: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          rate_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          currency?: string
          effective_date: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          rate_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          currency?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          rate_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bracket_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_scan_sessions: {
        Row: {
          created_at: string | null
          end_time: string | null
          failed_scans: number | null
          id: string
          notes: string | null
          operator_id: string
          organization_id: string
          pallet_id: string
          session_name: string | null
          start_time: string | null
          status: string
          successful_scans: number | null
          total_items_scanned: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          failed_scans?: number | null
          id?: string
          notes?: string | null
          operator_id: string
          organization_id: string
          pallet_id: string
          session_name?: string | null
          start_time?: string | null
          status?: string
          successful_scans?: number | null
          total_items_scanned?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          failed_scans?: number | null
          id?: string
          notes?: string | null
          operator_id?: string
          organization_id?: string
          pallet_id?: string
          session_name?: string | null
          start_time?: string | null
          status?: string
          successful_scans?: number | null
          total_items_scanned?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_scan_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_scan_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_scan_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bulk_scan_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_scan_sessions_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_of_custody_records: {
        Row: {
          actual_return_date: string | null
          asset_id: string
          asset_type: string
          condition: string
          created_at: string | null
          created_by: string
          custody_type: string
          expected_return_date: string | null
          from_location: string | null
          from_party: string | null
          id: string
          notes: string | null
          organization_id: string
          purpose: string | null
          requires_documentation: boolean | null
          requires_signature: boolean | null
          status: string
          to_location: string | null
          to_party: string | null
          transfer_date: string
          updated_at: string | null
        }
        Insert: {
          actual_return_date?: string | null
          asset_id: string
          asset_type?: string
          condition?: string
          created_at?: string | null
          created_by: string
          custody_type?: string
          expected_return_date?: string | null
          from_location?: string | null
          from_party?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          purpose?: string | null
          requires_documentation?: boolean | null
          requires_signature?: boolean | null
          status?: string
          to_location?: string | null
          to_party?: string | null
          transfer_date: string
          updated_at?: string | null
        }
        Update: {
          actual_return_date?: string | null
          asset_id?: string
          asset_type?: string
          condition?: string
          created_at?: string | null
          created_by?: string
          custody_type?: string
          expected_return_date?: string | null
          from_location?: string | null
          from_party?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          purpose?: string | null
          requires_documentation?: boolean | null
          requires_signature?: boolean | null
          status?: string
          to_location?: string | null
          to_party?: string | null
          transfer_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_of_custody_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_of_custody_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_of_custody_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chain_of_custody_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          additional_info: string | null
          assigned_to: string | null
          category: string
          contact_phone: string | null
          created_at: string | null
          description: string
          estimated_value: number | null
          id: string
          incident_date: string | null
          location: string | null
          organization_id: string
          priority: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          assigned_to?: string | null
          category: string
          contact_phone?: string | null
          created_at?: string | null
          description: string
          estimated_value?: number | null
          id?: string
          incident_date?: string | null
          location?: string | null
          organization_id: string
          priority: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          assigned_to?: string | null
          category?: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string
          estimated_value?: number | null
          id?: string
          incident_date?: string | null
          location?: string | null
          organization_id?: string
          priority?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          assigned_to: string | null
          corrective_actions: string | null
          created_at: string | null
          created_by: string
          description: string
          hazmat_involved: boolean | null
          id: string
          incident_date: string | null
          location: string | null
          organization_id: string
          prevention_measures: string | null
          regulatory_body: string | null
          report_type: string
          severity: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by: string
          description: string
          hazmat_involved?: boolean | null
          id?: string
          incident_date?: string | null
          location?: string | null
          organization_id: string
          prevention_measures?: string | null
          regulatory_body?: string | null
          report_type: string
          severity?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          hazmat_involved?: boolean | null
          id?: string
          incident_date?: string | null
          location?: string | null
          organization_id?: string
          prevention_measures?: string | null
          regulatory_body?: string | null
          report_type?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_violations: {
        Row: {
          assigned_to: string | null
          corrective_actions: string | null
          created_at: string | null
          description: string
          fine_amount: number | null
          id: string
          manifest_id: string | null
          organization_id: string
          prevention_measures: string | null
          regulatory_body: string | null
          reported_by: string
          severity: string
          status: string
          updated_at: string | null
          violation_date: string
          violation_type: string
        }
        Insert: {
          assigned_to?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          description: string
          fine_amount?: number | null
          id?: string
          manifest_id?: string | null
          organization_id: string
          prevention_measures?: string | null
          regulatory_body?: string | null
          reported_by: string
          severity?: string
          status?: string
          updated_at?: string | null
          violation_date: string
          violation_type: string
        }
        Update: {
          assigned_to?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          description?: string
          fine_amount?: number | null
          id?: string
          manifest_id?: string | null
          organization_id?: string
          prevention_measures?: string | null
          regulatory_body?: string | null
          reported_by?: string
          severity?: string
          status?: string
          updated_at?: string | null
          violation_date?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_violations_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "hazmat_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "compliance_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_audit_log: {
        Row: {
          action: string
          created_at: string | null
          custody_id: string | null
          details: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          custody_id?: string | null
          details?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          custody_id?: string | null
          details?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_audit_log_custody_id_fkey"
            columns: ["custody_id"]
            isOneToOne: false
            referencedRelation: "chain_of_custody_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custody_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_documents: {
        Row: {
          created_at: string | null
          custody_id: string
          description: string | null
          document_type: string
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          status: string
          title: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          custody_id: string
          description?: string | null
          document_type: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          status?: string
          title: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          custody_id?: string
          description?: string | null
          document_type?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_documents_custody_id_fkey"
            columns: ["custody_id"]
            isOneToOne: false
            referencedRelation: "chain_of_custody_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custody_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_events: {
        Row: {
          condition_notes: string | null
          created_at: string | null
          created_by: string
          custody_id: string
          description: string
          event_date: string
          event_type: string
          id: string
          location: string | null
          organization_id: string
          performed_by: string | null
          photos: Json | null
          signature_required: boolean | null
          updated_at: string | null
          witness_name: string | null
          witness_required: boolean | null
          witness_signature: string | null
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string | null
          created_by: string
          custody_id: string
          description: string
          event_date: string
          event_type: string
          id?: string
          location?: string | null
          organization_id: string
          performed_by?: string | null
          photos?: Json | null
          signature_required?: boolean | null
          updated_at?: string | null
          witness_name?: string | null
          witness_required?: boolean | null
          witness_signature?: string | null
        }
        Update: {
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string
          custody_id?: string
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          organization_id?: string
          performed_by?: string | null
          photos?: Json | null
          signature_required?: boolean | null
          updated_at?: string | null
          witness_name?: string | null
          witness_required?: boolean | null
          witness_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_events_custody_id_fkey"
            columns: ["custody_id"]
            isOneToOne: false
            referencedRelation: "chain_of_custody_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custody_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_notifications: {
        Row: {
          created_at: string | null
          custody_id: string
          delivery_method: string | null
          id: string
          message: string
          notification_type: string
          organization_id: string
          read_at: string | null
          recipient_id: string
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          custody_id: string
          delivery_method?: string | null
          id?: string
          message: string
          notification_type: string
          organization_id: string
          read_at?: string | null
          recipient_id: string
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          custody_id?: string
          delivery_method?: string | null
          id?: string
          message?: string
          notification_type?: string
          organization_id?: string
          read_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_notifications_custody_id_fkey"
            columns: ["custody_id"]
            isOneToOne: false
            referencedRelation: "chain_of_custody_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custody_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_signatures: {
        Row: {
          created_at: string | null
          custody_id: string
          id: string
          ip_address: unknown
          location: string | null
          organization_id: string
          signature_data: string
          signature_type: string
          signed_at: string | null
          signer_id: string
          user_agent: string | null
          verification_method: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          custody_id: string
          id?: string
          ip_address?: unknown
          location?: string | null
          organization_id: string
          signature_data: string
          signature_type: string
          signed_at?: string | null
          signer_id: string
          user_agent?: string | null
          verification_method?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          custody_id?: string
          id?: string
          ip_address?: unknown
          location?: string | null
          organization_id?: string
          signature_data?: string
          signature_type?: string
          signed_at?: string | null
          signer_id?: string
          user_agent?: string | null
          verification_method?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_signatures_custody_id_fkey"
            columns: ["custody_id"]
            isOneToOne: false
            referencedRelation: "chain_of_custody_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custody_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          fields: Json | null
          id: string
          is_active: boolean | null
          organization_id: string
          required_fields: Json | null
          template_name: string
          template_type: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          required_fields?: Json | null
          template_name: string
          template_type: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          required_fields?: Json | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custody_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pages: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_homepage: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_keywords: string[] | null
          organization_id: string
          published_at: string | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content?: string
          created_at?: string | null
          id?: string
          is_homepage?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          organization_id: string
          published_at?: string | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_homepage?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          organization_id?: string
          published_at?: string | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_departments: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_departments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_holdings: {
        Row: {
          created_at: string | null
          customer_id: string | null
          cylinder_id: string | null
          id: string
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          cylinder_id?: string | null
          id?: string
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          cylinder_id?: string | null
          id?: string
          quantity?: number | null
        }
        Relationships: []
      }
      customer_imports: {
        Row: {
          AccountNumber: string | null
          contact_details: string | null
          created_at: string | null
          CustomerListID: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          AccountNumber?: string | null
          contact_details?: string | null
          created_at?: string | null
          CustomerListID?: string | null
          name?: string | null
          phone?: string | null
        }
        Update: {
          AccountNumber?: string | null
          contact_details?: string | null
          created_at?: string | null
          CustomerListID?: string | null
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      customer_pricing: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_type: string | null
          discount_percent: number | null
          effective_date: string | null
          expiry_date: string | null
          fixed_rate_override: number | null
          gas_type: string | null
          id: string
          is_active: boolean | null
          markup_percent: number | null
          notes: string | null
          organization_id: string | null
          rental_class_rates: Json
          rental_period: string | null
          rental_rates_by_product_code: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_type?: string | null
          discount_percent?: number | null
          effective_date?: string | null
          expiry_date?: string | null
          fixed_rate_override?: number | null
          gas_type?: string | null
          id?: string
          is_active?: boolean | null
          markup_percent?: number | null
          notes?: string | null
          organization_id?: string | null
          rental_class_rates?: Json
          rental_period?: string | null
          rental_rates_by_product_code?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_type?: string | null
          discount_percent?: number | null
          effective_date?: string | null
          expiry_date?: string | null
          fixed_rate_override?: number | null
          gas_type?: string | null
          id?: string
          is_active?: boolean | null
          markup_percent?: number | null
          notes?: string | null
          organization_id?: string | null
          rental_class_rates?: Json
          rental_period?: string | null
          rental_rates_by_product_code?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_customer_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["CustomerListID", "organization_id"]
          },
          {
            foreignKeyName: "customer_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pricing_overrides: {
        Row: {
          created_at: string | null
          custom_monthly_price: number | null
          custom_yearly_price: number | null
          customer_id: string
          discount_percent: number | null
          effective_date: string | null
          expiry_date: string | null
          fixed_rate_override: number | null
          id: string
          is_active: boolean | null
          organization_id: string
          product_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_monthly_price?: number | null
          custom_yearly_price?: number | null
          customer_id: string
          discount_percent?: number | null
          effective_date?: string | null
          expiry_date?: string | null
          fixed_rate_override?: number | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          product_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_monthly_price?: number | null
          custom_yearly_price?: number | null
          customer_id?: string
          discount_percent?: number | null
          effective_date?: string | null
          expiry_date?: string | null
          fixed_rate_override?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          product_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_pricing_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_support: {
        Row: {
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string
          organization_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_support_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_support_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_type: string | null
          AccountNumber: string | null
          address2: string | null
          address3: string | null
          address4: string | null
          address5: string | null
          auto_pay_enabled: boolean | null
          barcode: string | null
          barcode_number: string | null
          bill_city: string | null
          bill_postal_code: string | null
          bill_state: string | null
          billing_address_1: string | null
          billing_address_2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_email: string | null
          billing_mode: string
          billing_name: string | null
          billing_state: string | null
          billing_zip: string | null
          branch_location: string | null
          city: string | null
          contact_details: string | null
          created_at: string | null
          customer_barcode: string | null
          customer_number: string | null
          customer_type: string | null
          CustomerListID: string
          department: string | null
          display_name: string | null
          email: string | null
          fax: string | null
          id: string
          is_main_account: boolean | null
          location: string | null
          location_id: string | null
          name: string | null
          organization_id: string
          parent_customer_id: string | null
          payment_method_id: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          purchase_order: string | null
          rental_bill_email_to: string | null
          rental_rate: number | null
          salesman: string | null
          servicing_location: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_address_line3: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_state: string | null
          shipping_zip: string | null
          tax_region: string | null
        }
        Insert: {
          account_type?: string | null
          AccountNumber?: string | null
          address2?: string | null
          address3?: string | null
          address4?: string | null
          address5?: string | null
          auto_pay_enabled?: boolean | null
          barcode?: string | null
          barcode_number?: string | null
          bill_city?: string | null
          bill_postal_code?: string | null
          bill_state?: string | null
          billing_address_1?: string | null
          billing_address_2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_mode?: string
          billing_name?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          branch_location?: string | null
          city?: string | null
          contact_details?: string | null
          created_at?: string | null
          customer_barcode?: string | null
          customer_number?: string | null
          customer_type?: string | null
          CustomerListID: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_main_account?: boolean | null
          location?: string | null
          location_id?: string | null
          name?: string | null
          organization_id: string
          parent_customer_id?: string | null
          payment_method_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          purchase_order?: string | null
          rental_bill_email_to?: string | null
          rental_rate?: number | null
          salesman?: string | null
          servicing_location?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_address_line3?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          tax_region?: string | null
        }
        Update: {
          account_type?: string | null
          AccountNumber?: string | null
          address2?: string | null
          address3?: string | null
          address4?: string | null
          address5?: string | null
          auto_pay_enabled?: boolean | null
          barcode?: string | null
          barcode_number?: string | null
          bill_city?: string | null
          bill_postal_code?: string | null
          bill_state?: string | null
          billing_address_1?: string | null
          billing_address_2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_mode?: string
          billing_name?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          branch_location?: string | null
          city?: string | null
          contact_details?: string | null
          created_at?: string | null
          customer_barcode?: string | null
          customer_number?: string | null
          customer_type?: string | null
          CustomerListID?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_main_account?: boolean | null
          location?: string | null
          location_id?: string | null
          name?: string | null
          organization_id?: string
          parent_customer_id?: string | null
          payment_method_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          purchase_order?: string | null
          rental_bill_email_to?: string | null
          rental_rate?: number | null
          salesman?: string | null
          servicing_location?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_address_line3?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          tax_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_fills: {
        Row: {
          barcode_number: string | null
          created_at: string | null
          cylinder_id: string | null
          fill_date: string
          fill_timezone: string | null
          fill_type: string | null
          filled_by: string | null
          id: string
          notes: string | null
          organization_id: string | null
          previous_location: string | null
          previous_status: string | null
        }
        Insert: {
          barcode_number?: string | null
          created_at?: string | null
          cylinder_id?: string | null
          fill_date: string
          fill_timezone?: string | null
          fill_type?: string | null
          filled_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          previous_location?: string | null
          previous_status?: string | null
        }
        Update: {
          barcode_number?: string | null
          created_at?: string | null
          cylinder_id?: string | null
          fill_date?: string
          fill_timezone?: string | null
          fill_type?: string | null
          filled_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          previous_location?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_fills_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_fills_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_fills_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_fills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_fills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_fills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "cylinder_fills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_movements: {
        Row: {
          cylinder_id: string | null
          date: string | null
          from_location: string | null
          id: string
          notes: string | null
          to_location: string | null
        }
        Insert: {
          cylinder_id?: string | null
          date?: string | null
          from_location?: string | null
          id?: string
          notes?: string | null
          to_location?: string | null
        }
        Update: {
          cylinder_id?: string | null
          date?: string | null
          from_location?: string | null
          id?: string
          notes?: string | null
          to_location?: string | null
        }
        Relationships: []
      }
      cylinder_scans: {
        Row: {
          created_at: string | null
          customer_number: string
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          order_number: string
          organization_id: string | null
          return_cylinders: Json
          ship_cylinders: Json
        }
        Insert: {
          created_at?: string | null
          customer_number: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          order_number: string
          organization_id?: string | null
          return_cylinders: Json
          ship_cylinders: Json
        }
        Update: {
          created_at?: string | null
          customer_number?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          order_number?: string
          organization_id?: string | null
          return_cylinders?: Json
          ship_cylinders?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_scans_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_tests: {
        Row: {
          certificate_url: string | null
          created_at: string | null
          cylinder_id: string | null
          id: string
          result: string | null
          test_date: string | null
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string | null
          cylinder_id?: string | null
          id?: string
          result?: string | null
          test_date?: string | null
        }
        Update: {
          certificate_url?: string | null
          created_at?: string | null
          cylinder_id?: string | null
          id?: string
          result?: string | null
          test_date?: string | null
        }
        Relationships: []
      }
      cylinders: {
        Row: {
          barcode: string
          category: string | null
          gas_type: string | null
          item: string | null
          item_description: string | null
          ownership: string | null
          serial_number: string | null
          type: string | null
        }
        Insert: {
          barcode: string
          category?: string | null
          gas_type?: string | null
          item?: string | null
          item_description?: string | null
          ownership?: string | null
          serial_number?: string | null
          type?: string | null
        }
        Update: {
          barcode?: string
          category?: string | null
          gas_type?: string | null
          item?: string | null
          item_description?: string | null
          ownership?: string | null
          serial_number?: string | null
          type?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          customer_id: string | null
          customer_uuid: string | null
          delivery_date: string
          delivery_time: string | null
          delivery_time_actual: string | null
          departure_time: string | null
          driver_id: string | null
          estimated_time: string | null
          id: string
          location_updated_at: string | null
          notes: string | null
          organization_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_id?: string | null
          customer_uuid?: string | null
          delivery_date: string
          delivery_time?: string | null
          delivery_time_actual?: string | null
          departure_time?: string | null
          driver_id?: string | null
          estimated_time?: string | null
          id?: string
          location_updated_at?: string | null
          notes?: string | null
          organization_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_id?: string | null
          customer_uuid?: string | null
          delivery_date?: string
          delivery_time?: string | null
          delivery_time_actual?: string | null
          departure_time?: string | null
          driver_id?: string | null
          estimated_time?: string | null
          id?: string
          location_updated_at?: string | null
          notes?: string | null
          organization_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          created_at: string | null
          customer_id: string | null
          cylinder_id: string | null
          date: string | null
          id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          cylinder_id?: string | null
          date?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          cylinder_id?: string | null
          date?: string | null
          id?: string
          type?: string | null
        }
        Relationships: []
      }
      delivery_items: {
        Row: {
          bottle_id: string | null
          created_at: string | null
          delivery_id: string | null
          id: string
          notes: string | null
          quantity: number | null
        }
        Insert: {
          bottle_id?: string | null
          created_at?: string | null
          delivery_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
        }
        Update: {
          bottle_id?: string | null
          created_at?: string | null
          delivery_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          actual_arrival_time: string | null
          address: string | null
          created_at: string | null
          delivery_id: string | null
          estimated_arrival_time: string | null
          id: string
          latitude: number | null
          longitude: number | null
          sequence: number
        }
        Insert: {
          actual_arrival_time?: string | null
          address?: string | null
          created_at?: string | null
          delivery_id?: string | null
          estimated_arrival_time?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          sequence: number
        }
        Update: {
          actual_arrival_time?: string | null
          address?: string | null
          created_at?: string | null
          delivery_id?: string | null
          estimated_arrival_time?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_signatures: {
        Row: {
          customer_name: string | null
          device_info: Json | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          manifest_item_id: string
          signature_data: string
          signed_at: string | null
        }
        Insert: {
          customer_name?: string | null
          device_info?: Json | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          manifest_item_id: string
          signature_data: string
          signed_at?: string | null
        }
        Update: {
          customer_name?: string | null
          device_info?: Json | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          manifest_item_id?: string
          signature_data?: string
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_signatures_manifest_item_id_fkey"
            columns: ["manifest_item_id"]
            isOneToOne: false
            referencedRelation: "manifest_items"
            referencedColumns: ["id"]
          },
        ]
      }
      demurrage_rates: {
        Row: {
          base_rate: number
          calculation_method: string
          created_at: string | null
          created_by: string
          currency: string
          effective_date: string
          escalation_rate: number | null
          expiry_date: string | null
          grace_period: number | null
          id: string
          is_active: boolean | null
          maximum_rate: number | null
          organization_id: string
          rate_name: string
          updated_at: string | null
        }
        Insert: {
          base_rate?: number
          calculation_method?: string
          created_at?: string | null
          created_by: string
          currency?: string
          effective_date: string
          escalation_rate?: number | null
          expiry_date?: string | null
          grace_period?: number | null
          id?: string
          is_active?: boolean | null
          maximum_rate?: number | null
          organization_id: string
          rate_name: string
          updated_at?: string | null
        }
        Update: {
          base_rate?: number
          calculation_method?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          effective_date?: string
          escalation_rate?: number | null
          expiry_date?: string | null
          grace_period?: number | null
          id?: string
          is_active?: boolean | null
          maximum_rate?: number | null
          organization_id?: string
          rate_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demurrage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demurrage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demurrage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "demurrage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demurrage_rules: {
        Row: {
          created_at: string | null
          daily_penalty_rate: number
          gas_type: string
          grace_period_days: number
          id: string
          is_active: boolean | null
          max_penalty_days: number | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_penalty_rate?: number
          gas_type: string
          grace_period_days?: number
          id?: string
          is_active?: boolean | null
          max_penalty_days?: number | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_penalty_rate?: number
          gas_type?: string
          grace_period_days?: number
          id?: string
          is_active?: boolean | null
          max_penalty_days?: number | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demurrage_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demurrage_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demurrage_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "demurrage_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          start_date: string | null
          type: string
          value: number
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          start_date?: string | null
          type: string
          value: number
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          start_date?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          cylinder_id: string | null
          file_url: string | null
          id: string
          type: string | null
          uploaded_at: string | null
        }
        Insert: {
          cylinder_id?: string | null
          file_url?: string | null
          id?: string
          type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          cylinder_id?: string | null
          file_url?: string | null
          id?: string
          type?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      emergency_procedures: {
        Row: {
          cleanup_procedures: string | null
          containment_procedures: string | null
          created_at: string | null
          description: string
          emergency_contacts: Json | null
          emergency_type: string
          evacuation_procedures: string | null
          hazmat_class: string
          id: string
          organization_id: string
          procedure_name: string
          reporting_requirements: string | null
          required_equipment: Json | null
          response_steps: Json
          severity_level: string
          updated_at: string | null
        }
        Insert: {
          cleanup_procedures?: string | null
          containment_procedures?: string | null
          created_at?: string | null
          description: string
          emergency_contacts?: Json | null
          emergency_type: string
          evacuation_procedures?: string | null
          hazmat_class: string
          id?: string
          organization_id: string
          procedure_name: string
          reporting_requirements?: string | null
          required_equipment?: Json | null
          response_steps?: Json
          severity_level: string
          updated_at?: string | null
        }
        Update: {
          cleanup_procedures?: string | null
          containment_procedures?: string | null
          created_at?: string | null
          description?: string
          emergency_contacts?: Json | null
          emergency_type?: string
          evacuation_procedures?: string | null
          hazmat_class?: string
          id?: string
          organization_id?: string
          procedure_name?: string
          reporting_requirements?: string | null
          required_equipment?: Json | null
          response_steps?: Json
          severity_level?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_procedures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_procedures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_procedures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "emergency_procedures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_format_templates: {
        Row: {
          category: string | null
          column_mappings: Json | null
          created_at: string | null
          created_by: string | null
          delimiter: string | null
          description: string | null
          encoding: string | null
          file_types: Json | null
          has_header: boolean | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          transformations: Json | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          category?: string | null
          column_mappings?: Json | null
          created_at?: string | null
          created_by?: string | null
          delimiter?: string | null
          description?: string | null
          encoding?: string | null
          file_types?: Json | null
          has_header?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          transformations?: Json | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          category?: string | null
          column_mappings?: Json | null
          created_at?: string | null
          created_by?: string | null
          delimiter?: string | null
          description?: string | null
          encoding?: string | null
          file_types?: Json | null
          has_header?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          transformations?: Json | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "file_format_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_format_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_format_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_format_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "file_format_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_formats: {
        Row: {
          category: string
          column_mappings: Json | null
          created_at: string | null
          created_by: string | null
          delimiter: string | null
          description: string | null
          encoding: string | null
          file_types: Json | null
          has_header: boolean | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          transformations: Json | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          category: string
          column_mappings?: Json | null
          created_at?: string | null
          created_by?: string | null
          delimiter?: string | null
          description?: string | null
          encoding?: string | null
          file_types?: Json | null
          has_header?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          transformations?: Json | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          category?: string
          column_mappings?: Json | null
          created_at?: string | null
          created_by?: string | null
          delimiter?: string | null
          description?: string | null
          encoding?: string | null
          file_types?: Json | null
          has_header?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          transformations?: Json | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "file_formats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_formats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_formats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_formats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "file_formats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_types: {
        Row: {
          category: string | null
          description: string | null
          dock_stock: string | null
          group_name: string | null
          id: number
          in_house_total: number | null
          lost_total: number | null
          name: string | null
          product_code: string | null
          total: number | null
          type: string | null
          with_customer_total: number | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          dock_stock?: string | null
          group_name?: string | null
          id?: number
          in_house_total?: number | null
          lost_total?: number | null
          name?: string | null
          product_code?: string | null
          total?: number | null
          type?: string | null
          with_customer_total?: number | null
        }
        Update: {
          category?: string | null
          description?: string | null
          dock_stock?: string | null
          group_name?: string | null
          id?: number
          in_house_total?: number | null
          lost_total?: number | null
          name?: string | null
          product_code?: string | null
          total?: number | null
          type?: string | null
          with_customer_total?: number | null
        }
        Relationships: []
      }
      hazmat_certifications: {
        Row: {
          certification_number: string | null
          certification_type: string
          created_at: string | null
          expiry_date: string
          id: string
          issue_date: string
          issuing_authority: string
          notes: string | null
          organization_id: string
          person_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          certification_number?: string | null
          certification_type: string
          created_at?: string | null
          expiry_date: string
          id?: string
          issue_date: string
          issuing_authority: string
          notes?: string | null
          organization_id: string
          person_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          certification_number?: string | null
          certification_type?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          issue_date?: string
          issuing_authority?: string
          notes?: string | null
          organization_id?: string
          person_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "hazmat_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_items: {
        Row: {
          additional_handling: string | null
          created_at: string | null
          disposal_requirements: string | null
          hazard_class: string | null
          hazmat_class: string
          id: string
          item_name: string
          limited_quantity: boolean | null
          manifest_id: string | null
          marine_pollutant: boolean | null
          organization_id: string
          packing_group: string | null
          proper_shipping_name: string
          quantity: number
          special_provisions: string | null
          storage_requirements: string | null
          temperature_controlled: boolean | null
          un_number: string
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          additional_handling?: string | null
          created_at?: string | null
          disposal_requirements?: string | null
          hazard_class?: string | null
          hazmat_class: string
          id?: string
          item_name: string
          limited_quantity?: boolean | null
          manifest_id?: string | null
          marine_pollutant?: boolean | null
          organization_id: string
          packing_group?: string | null
          proper_shipping_name: string
          quantity: number
          special_provisions?: string | null
          storage_requirements?: string | null
          temperature_controlled?: boolean | null
          un_number: string
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          additional_handling?: string | null
          created_at?: string | null
          disposal_requirements?: string | null
          hazard_class?: string | null
          hazmat_class?: string
          id?: string
          item_name?: string
          limited_quantity?: boolean | null
          manifest_id?: string | null
          marine_pollutant?: boolean | null
          organization_id?: string
          packing_group?: string | null
          proper_shipping_name?: string
          quantity?: number
          special_provisions?: string | null
          storage_requirements?: string | null
          temperature_controlled?: boolean | null
          un_number?: string
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_items_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "hazmat_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "hazmat_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_manifest_items: {
        Row: {
          additional_handling: string | null
          created_at: string | null
          hazard_class: string | null
          hazmat_class: string
          id: string
          item_name: string
          limited_quantity: boolean | null
          manifest_id: string
          marine_pollutant: boolean | null
          organization_id: string
          packing_group: string | null
          proper_shipping_name: string
          quantity: number
          special_provisions: string | null
          temperature_controlled: boolean | null
          un_number: string
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          additional_handling?: string | null
          created_at?: string | null
          hazard_class?: string | null
          hazmat_class: string
          id?: string
          item_name: string
          limited_quantity?: boolean | null
          manifest_id: string
          marine_pollutant?: boolean | null
          organization_id: string
          packing_group?: string | null
          proper_shipping_name: string
          quantity: number
          special_provisions?: string | null
          temperature_controlled?: boolean | null
          un_number: string
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          additional_handling?: string | null
          created_at?: string | null
          hazard_class?: string | null
          hazmat_class?: string
          id?: string
          item_name?: string
          limited_quantity?: boolean | null
          manifest_id?: string
          marine_pollutant?: boolean | null
          organization_id?: string
          packing_group?: string | null
          proper_shipping_name?: string
          quantity?: number
          special_provisions?: string | null
          temperature_controlled?: boolean | null
          un_number?: string
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_manifest_items_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "hazmat_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_manifest_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_manifest_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_manifest_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "hazmat_manifest_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazmat_manifests: {
        Row: {
          additional_handling: string | null
          carrier_address: string | null
          carrier_name: string | null
          certification_statement: string | null
          consignee_address: string
          consignee_name: string
          created_at: string | null
          created_by: string
          date_signed: string | null
          emergency_contact: string
          emergency_phone: string
          hazard_class: string | null
          hazmat_class: string
          id: string
          limited_quantity: boolean | null
          manifest_number: string
          marine_pollutant: boolean | null
          organization_id: string
          packing_group: string | null
          proper_shipping_name: string
          quantity: number
          regulatory_body: string | null
          shipper_address: string
          shipper_name: string
          signature: string | null
          special_provisions: string | null
          status: string
          temperature_controlled: boolean | null
          un_number: string
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          additional_handling?: string | null
          carrier_address?: string | null
          carrier_name?: string | null
          certification_statement?: string | null
          consignee_address: string
          consignee_name: string
          created_at?: string | null
          created_by: string
          date_signed?: string | null
          emergency_contact: string
          emergency_phone: string
          hazard_class?: string | null
          hazmat_class: string
          id?: string
          limited_quantity?: boolean | null
          manifest_number: string
          marine_pollutant?: boolean | null
          organization_id: string
          packing_group?: string | null
          proper_shipping_name: string
          quantity: number
          regulatory_body?: string | null
          shipper_address: string
          shipper_name: string
          signature?: string | null
          special_provisions?: string | null
          status?: string
          temperature_controlled?: boolean | null
          un_number: string
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          additional_handling?: string | null
          carrier_address?: string | null
          carrier_name?: string | null
          certification_statement?: string | null
          consignee_address?: string
          consignee_name?: string
          created_at?: string | null
          created_by?: string
          date_signed?: string | null
          emergency_contact?: string
          emergency_phone?: string
          hazard_class?: string | null
          hazmat_class?: string
          id?: string
          limited_quantity?: boolean | null
          manifest_number?: string
          marine_pollutant?: boolean | null
          organization_id?: string
          packing_group?: string | null
          proper_shipping_name?: string
          quantity?: number
          regulatory_body?: string | null
          shipper_address?: string
          shipper_name?: string
          signature?: string | null
          special_provisions?: string | null
          status?: string
          temperature_controlled?: boolean | null
          un_number?: string
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hazmat_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazmat_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "hazmat_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_addendums: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          organization_id: string | null
          record_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          organization_id?: string | null
          record_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          organization_id?: string | null
          record_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      import_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          message: string | null
          organization_id: string | null
          record_id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          message?: string | null
          organization_id?: string | null
          record_id: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          message?: string | null
          organization_id?: string | null
          record_id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      import_exceptions: {
        Row: {
          asset_id: string | null
          created_at: string | null
          id: string
          message: string
          organization_id: string | null
          record_id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          record_id: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          record_id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      import_history: {
        Row: {
          error_message: string | null
          file_name: string | null
          finished_at: string | null
          id: string
          import_type: string | null
          organization_id: string | null
          started_at: string | null
          status: string | null
          summary: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          error_message?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          import_type?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          error_message?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          import_type?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      imported_invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_approval_reason: string | null
          auto_approved: boolean | null
          customer_id: string | null
          customer_name: string | null
          data: Json
          date: string | null
          error_message: string | null
          id: number
          investigation_marked_at: string | null
          investigation_reason: string | null
          investigation_started_at: string | null
          investigation_started_by: string | null
          location: string | null
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          order_number: string | null
          organization_id: string | null
          po_number: string | null
          rejected_at: string | null
          rejected_by: string | null
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_approval_reason?: string | null
          auto_approved?: boolean | null
          customer_id?: string | null
          customer_name?: string | null
          data: Json
          date?: string | null
          error_message?: string | null
          id?: number
          investigation_marked_at?: string | null
          investigation_reason?: string | null
          investigation_started_at?: string | null
          investigation_started_by?: string | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          po_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_approval_reason?: string | null
          auto_approved?: boolean | null
          customer_id?: string | null
          customer_name?: string | null
          data?: Json
          date?: string | null
          error_message?: string | null
          id?: number
          investigation_marked_at?: string | null
          investigation_reason?: string | null
          investigation_started_at?: string | null
          investigation_started_by?: string | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          po_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      imported_sales_receipts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          customer_id: string | null
          customer_name: string | null
          data: Json
          date: string | null
          error_message: string | null
          id: number
          investigation_marked_at: string | null
          investigation_reason: string | null
          location: string | null
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          order_number: string | null
          organization_id: string | null
          po_number: string | null
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          data: Json
          date?: string | null
          error_message?: string | null
          id?: number
          investigation_marked_at?: string | null
          investigation_reason?: string | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          po_number?: string | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          data?: Json
          date?: string | null
          error_message?: string | null
          id?: number
          investigation_marked_at?: string | null
          investigation_reason?: string | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          po_number?: string | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync: string | null
          name: string
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          name: string
          organization_id: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          id: string
          last_invoice_month: string
          last_invoice_number: number
        }
        Insert: {
          id: string
          last_invoice_month: string
          last_invoice_number: number
        }
        Update: {
          id?: string
          last_invoice_month?: string
          last_invoice_number?: number
        }
        Relationships: []
      }
      invoice_email_sends: {
        Row: {
          created_at: string | null
          customer_id: string | null
          email_from: string | null
          emailed_to: string[]
          id: string
          invoice_number: string
          message_id: string | null
          organization_id: string
          pdf_storage_path: string | null
          period_end: string | null
          period_start: string | null
          sent_at: string
          sent_by_user_id: string | null
          subject: string | null
          subscription_id: string | null
          subscription_invoice_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          email_from?: string | null
          emailed_to?: string[]
          id?: string
          invoice_number: string
          message_id?: string | null
          organization_id: string
          pdf_storage_path?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string
          sent_by_user_id?: string | null
          subject?: string | null
          subscription_id?: string | null
          subscription_invoice_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          email_from?: string | null
          emailed_to?: string[]
          id?: string
          invoice_number?: string
          message_id?: string | null
          organization_id?: string
          pdf_storage_path?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string
          sent_by_user_id?: string | null
          subject?: string | null
          subscription_id?: string | null
          subscription_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoice_email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          product_code: string | null
          qty_in: number | null
          qty_out: number | null
          rate: number | null
          serial_number: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          product_code?: string | null
          qty_in?: number | null
          qty_out?: number | null
          rate?: number | null
          serial_number?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          product_code?: string | null
          qty_in?: number | null
          qty_out?: number | null
          rate?: number | null
          serial_number?: string | null
        }
        Relationships: []
      }
      invoice_reminders: {
        Row: {
          clicked: boolean | null
          created_at: string | null
          days_before_due: number | null
          delivery_status: string | null
          email_address: string
          id: string
          invoice_id: string | null
          opened: boolean | null
          organization_id: string | null
          reminder_type: string
          sent_date: string | null
          subject: string | null
          template_used: string | null
        }
        Insert: {
          clicked?: boolean | null
          created_at?: string | null
          days_before_due?: number | null
          delivery_status?: string | null
          email_address: string
          id?: string
          invoice_id?: string | null
          opened?: boolean | null
          organization_id?: string | null
          reminder_type: string
          sent_date?: string | null
          subject?: string | null
          template_used?: string | null
        }
        Update: {
          clicked?: boolean | null
          created_at?: string | null
          days_before_due?: number | null
          delivery_status?: string | null
          email_address?: string
          id?: string
          invoice_id?: string | null
          opened?: boolean | null
          organization_id?: string | null
          reminder_type?: string
          sent_date?: string | null
          subject?: string | null
          template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoice_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          agreement_prefix: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          default_template_id: string | null
          gst_number: string | null
          id: string
          invoice_footer: string | null
          invoice_notes: string | null
          invoice_prefix: string | null
          next_agreement_number: number | null
          next_invoice_number: number | null
          organization_id: string
          payment_terms: string | null
          primary_color: string | null
          remit_address_line1: string | null
          remit_address_line2: string | null
          remit_address_line3: string | null
          remit_name: string | null
          secondary_color: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          agreement_prefix?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_template_id?: string | null
          gst_number?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_notes?: string | null
          invoice_prefix?: string | null
          next_agreement_number?: number | null
          next_invoice_number?: number | null
          organization_id: string
          payment_terms?: string | null
          primary_color?: string | null
          remit_address_line1?: string | null
          remit_address_line2?: string | null
          remit_address_line3?: string | null
          remit_name?: string | null
          secondary_color?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          agreement_prefix?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_template_id?: string | null
          gst_number?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_notes?: string | null
          invoice_prefix?: string | null
          next_agreement_number?: number | null
          next_invoice_number?: number | null
          organization_id?: string
          payment_terms?: string | null
          primary_color?: string | null
          remit_address_line1?: string | null
          remit_address_line2?: string | null
          remit_address_line3?: string | null
          remit_name?: string | null
          secondary_color?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_settings_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoice_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          layout_json: Json
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout_json?: Json
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout_json?: Json
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoice_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          amount_paid: number | null
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string
          customer_name: string | null
          cylinders_count: number | null
          details: string | null
          due_date: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          email_sent_date: string | null
          generated_automatically: boolean | null
          generation_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          issue_date: string | null
          line_items: Json | null
          organization_id: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          rental_days: number | null
          rental_id: string | null
          rental_type: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          amount_paid?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id: string
          customer_name?: string | null
          cylinders_count?: number | null
          details?: string | null
          due_date?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_sent_date?: string | null
          generated_automatically?: boolean | null
          generation_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          line_items?: Json | null
          organization_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          rental_days?: number | null
          rental_id?: string | null
          rental_type?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          amount_paid?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string
          customer_name?: string | null
          cylinders_count?: number | null
          details?: string | null
          due_date?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_sent_date?: string | null
          generated_automatically?: boolean | null
          generation_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          line_items?: Json | null
          organization_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          rental_days?: number | null
          rental_id?: string | null
          rental_type?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_agreement_items: {
        Row: {
          created_at: string | null
          description: string
          gas_type: string | null
          id: string
          item_type: string
          lease_agreement_id: string
          organization_id: string
          product_code: string | null
          quantity: number
          size: string | null
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          gas_type?: string | null
          id?: string
          item_type: string
          lease_agreement_id: string
          organization_id: string
          product_code?: string | null
          quantity?: number
          size?: string | null
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          gas_type?: string | null
          id?: string
          item_type?: string
          lease_agreement_id?: string
          organization_id?: string
          product_code?: string | null
          quantity?: number
          size?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_agreement_items_lease_agreement_id_fkey"
            columns: ["lease_agreement_id"]
            isOneToOne: false
            referencedRelation: "lease_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreement_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreement_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreement_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lease_agreement_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_agreements: {
        Row: {
          agreement_number: string
          annual_amount: number
          asset_locations: string[] | null
          asset_types: string[] | null
          auto_renewal: boolean | null
          billing_address: string | null
          billing_contact_email: string | null
          billing_frequency: string
          bottle_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          customer_name: string
          end_date: string
          id: string
          last_billing_date: string | null
          max_asset_count: number | null
          next_billing_date: string | null
          organization_id: string
          payment_terms: string | null
          renewal_notice_days: number | null
          special_provisions: string | null
          start_date: string
          status: string
          tax_rate: number | null
          terms_and_conditions: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          agreement_number: string
          annual_amount: number
          asset_locations?: string[] | null
          asset_types?: string[] | null
          auto_renewal?: boolean | null
          billing_address?: string | null
          billing_contact_email?: string | null
          billing_frequency?: string
          bottle_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          customer_name: string
          end_date: string
          id?: string
          last_billing_date?: string | null
          max_asset_count?: number | null
          next_billing_date?: string | null
          organization_id: string
          payment_terms?: string | null
          renewal_notice_days?: number | null
          special_provisions?: string | null
          start_date: string
          status?: string
          tax_rate?: number | null
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          agreement_number?: string
          annual_amount?: number
          asset_locations?: string[] | null
          asset_types?: string[] | null
          auto_renewal?: boolean | null
          billing_address?: string | null
          billing_contact_email?: string | null
          billing_frequency?: string
          bottle_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          customer_name?: string
          end_date?: string
          id?: string
          last_billing_date?: string | null
          max_asset_count?: number | null
          next_billing_date?: string | null
          organization_id?: string
          payment_terms?: string | null
          renewal_notice_days?: number | null
          special_provisions?: string | null
          start_date?: string
          status?: string
          tax_rate?: number | null
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_agreements_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lease_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_billing_history: {
        Row: {
          billing_date: string
          billing_period_end: string
          billing_period_start: string
          created_at: string | null
          due_date: string
          id: string
          invoice_number: string | null
          invoice_sent_date: string | null
          lease_agreement_id: string
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          billing_date: string
          billing_period_end: string
          billing_period_start: string
          created_at?: string | null
          due_date: string
          id?: string
          invoice_number?: string | null
          invoice_sent_date?: string | null
          lease_agreement_id: string
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          subtotal: number
          tax_amount?: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          billing_date?: string
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string | null
          invoice_sent_date?: string | null
          lease_agreement_id?: string
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_billing_history_lease_agreement_id_fkey"
            columns: ["lease_agreement_id"]
            isOneToOne: false
            referencedRelation: "lease_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_billing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_billing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_billing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lease_billing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      liquid_stock: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          product: string | null
          quantity: number | null
          tank_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          product?: string | null
          quantity?: number | null
          tank_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          product?: string | null
          quantity?: number | null
          tank_id?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          charge_gst: boolean | null
          charge_pst: boolean | null
          created_at: string | null
          gst_rate: number | null
          id: string
          name: string
          organization_id: string
          province: string | null
          pst_rate: number | null
          tax_rate: number | null
          total_tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          charge_gst?: boolean | null
          charge_pst?: boolean | null
          created_at?: string | null
          gst_rate?: number | null
          id?: string
          name: string
          organization_id: string
          province?: string | null
          pst_rate?: number | null
          tax_rate?: number | null
          total_tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          charge_gst?: boolean | null
          charge_pst?: boolean | null
          created_at?: string | null
          gst_rate?: number | null
          id?: string
          name?: string
          organization_id?: string
          province?: string | null
          pst_rate?: number | null
          tax_rate?: number | null
          total_tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance: {
        Row: {
          cylinder_id: string | null
          date: string | null
          id: string
          notes: string | null
          type: string | null
        }
        Insert: {
          cylinder_id?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          type?: string | null
        }
        Update: {
          cylinder_id?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          type?: string | null
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          actions_taken: string | null
          bottle_id: string | null
          completed_at: string | null
          cost: number | null
          created_at: string | null
          description: string
          findings: string | null
          id: string
          maintenance_type: string
          next_maintenance_date: string | null
          organization_id: string
          parts_used: Json | null
          performed_by: string
          status: string
          task_id: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          actions_taken?: string | null
          bottle_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          description: string
          findings?: string | null
          id?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          organization_id: string
          parts_used?: Json | null
          performed_by: string
          status?: string
          task_id?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          actions_taken?: string | null
          bottle_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string
          findings?: string | null
          id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          organization_id?: string
          parts_used?: Json | null
          performed_by?: string
          status?: string
          task_id?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "maintenance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "maintenance_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          assigned_to: string | null
          bottle_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          organization_id: string
          scheduled_date: string
          status: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          assigned_to?: string | null
          bottle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          organization_id: string
          scheduled_date: string
          status?: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          assigned_to?: string | null
          bottle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          scheduled_date?: string
          status?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "maintenance_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          attachments: Json | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          estimated_duration: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          priority: string
          status: string
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          actual_duration?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          priority?: string
          status?: string
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          actual_duration?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          priority?: string
          status?: string
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "maintenance_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "maintenance_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_templates: {
        Row: {
          category: string
          checklist_template: Json | null
          created_at: string | null
          description: string | null
          estimated_duration: number | null
          id: string
          name: string
          organization_id: string
          parts_template: Json | null
          safety_template: Json | null
          updated_at: string | null
        }
        Insert: {
          category: string
          checklist_template?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          name: string
          organization_id: string
          parts_template?: Json | null
          safety_template?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          checklist_template?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          name?: string
          organization_id?: string
          parts_template?: Json | null
          safety_template?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "maintenance_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_workflows: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          category: string
          checklist_items: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          documentation_completed: boolean | null
          documentation_required: boolean | null
          due_date: string | null
          estimated_duration: number | null
          frequency: string
          id: string
          name: string
          organization_id: string
          priority: string
          required_parts: Json | null
          safety_requirements: Json | null
          started_at: string | null
          status: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_duration?: number | null
          assigned_to?: string | null
          category: string
          checklist_items?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          documentation_completed?: boolean | null
          documentation_required?: boolean | null
          due_date?: string | null
          estimated_duration?: number | null
          frequency: string
          id?: string
          name: string
          organization_id: string
          priority: string
          required_parts?: Json | null
          safety_requirements?: Json | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_duration?: number | null
          assigned_to?: string | null
          category?: string
          checklist_items?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          documentation_completed?: boolean | null
          documentation_required?: boolean | null
          due_date?: string | null
          estimated_duration?: number | null
          frequency?: string
          id?: string
          name?: string
          organization_id?: string
          priority?: string
          required_parts?: Json | null
          safety_requirements?: Json | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "maintenance_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      manifest_items: {
        Row: {
          actual_quantity: number | null
          barcode_number: string
          bottle_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          delivery_location: string | null
          delivery_notes: string | null
          delivery_type: string | null
          exception_reason: string | null
          id: string
          loaded_at: string | null
          manifest_id: string
          photo_urls: string[] | null
          planned_quantity: number | null
          product_type: string | null
          signature_captured: boolean | null
          signature_data: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_quantity?: number | null
          barcode_number: string
          bottle_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          delivery_location?: string | null
          delivery_notes?: string | null
          delivery_type?: string | null
          exception_reason?: string | null
          id?: string
          loaded_at?: string | null
          manifest_id: string
          photo_urls?: string[] | null
          planned_quantity?: number | null
          product_type?: string | null
          signature_captured?: boolean | null
          signature_data?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_quantity?: number | null
          barcode_number?: string
          bottle_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          delivery_location?: string | null
          delivery_notes?: string | null
          delivery_type?: string | null
          exception_reason?: string | null
          id?: string
          loaded_at?: string | null
          manifest_id?: string
          photo_urls?: string[] | null
          planned_quantity?: number | null
          product_type?: string | null
          signature_captured?: boolean | null
          signature_data?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifest_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_items_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "truck_manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          organization_id: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_backups: {
        Row: {
          backup_data: Json | null
          backup_date: string
          backup_size_mb: number | null
          backup_status: string
          backup_type: string
          bottles_count: number | null
          completed_at: string | null
          created_at: string | null
          customers_count: number | null
          error_message: string | null
          id: string
          organization_id: string
        }
        Insert: {
          backup_data?: Json | null
          backup_date?: string
          backup_size_mb?: number | null
          backup_status?: string
          backup_type?: string
          bottles_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          customers_count?: number | null
          error_message?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          backup_data?: Json | null
          backup_date?: string
          backup_size_mb?: number | null
          backup_status?: string
          backup_type?: string
          bottles_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          customers_count?: number | null
          error_message?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_backups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_backups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_backups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_backups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_at: string | null
          invited_by: string | null
          organization_id: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at: string
          id?: string
          invite_token?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id: string
          role?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_join_codes: {
        Row: {
          assigned_role: string | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          notes: string | null
          organization_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          assigned_role?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          notes?: string | null
          organization_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          assigned_role?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          notes?: string | null
          organization_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_join_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_rental_classes: {
        Row: {
          class_name: string
          created_at: string | null
          default_daily: number | null
          default_monthly: number | null
          default_weekly: number | null
          group_name: string
          id: string
          match_category: string | null
          match_product_code: string | null
          organization_id: string
          rental_method: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          class_name: string
          created_at?: string | null
          default_daily?: number | null
          default_monthly?: number | null
          default_weekly?: number | null
          group_name?: string
          id?: string
          match_category?: string | null
          match_product_code?: string | null
          organization_id: string
          rental_method?: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          class_name?: string
          created_at?: string | null
          default_daily?: number | null
          default_monthly?: number | null
          default_weekly?: number | null
          group_name?: string
          id?: string
          match_category?: string | null
          match_product_code?: string | null
          organization_id?: string
          rental_method?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_verifications: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string | null
          organization_name: string
          user_name: string
          verification_token: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          organization_id?: string | null
          organization_name: string
          user_name: string
          verification_token?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          organization_name?: string
          user_name?: string
          verification_token?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active_discount_id: string | null
          address: string | null
          app_icon_url: string | null
          app_name: string | null
          asset_display_name: string | null
          asset_display_name_plural: string | null
          asset_type: string | null
          asset_type_plural: string | null
          barcode_format: Json | null
          city: string | null
          country: string | null
          created_at: string | null
          custom_terminology: Json | null
          default_invoice_email: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          domain: string | null
          email: string | null
          email_from: string | null
          email_password: string | null
          email_user: string | null
          feature_toggles: Json | null
          format_configuration: Json | null
          id: string
          industry: string | null
          integration_settings: Json | null
          invoice_emails: Json | null
          is_active: boolean | null
          join_code: string | null
          logo_url: string | null
          max_bottles: number | null
          max_customers: number | null
          max_cylinders: number | null
          max_users: number | null
          name: string
          order_number_format: Json | null
          payment_method_id: string | null
          payment_required: boolean | null
          phone: string | null
          postal_code: string | null
          primary_color: string | null
          rental_invoice_email_template: Json | null
          secondary_color: string | null
          serial_number_format: Json | null
          settings: Json | null
          show_app_icon: boolean | null
          slug: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          state: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          subscription_plan_id: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          trial_end_date: string | null
          trial_ends_at: string | null
          trial_start_date: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          active_discount_id?: string | null
          address?: string | null
          app_icon_url?: string | null
          app_name?: string | null
          asset_display_name?: string | null
          asset_display_name_plural?: string | null
          asset_type?: string | null
          asset_type_plural?: string | null
          barcode_format?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_terminology?: Json | null
          default_invoice_email?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          domain?: string | null
          email?: string | null
          email_from?: string | null
          email_password?: string | null
          email_user?: string | null
          feature_toggles?: Json | null
          format_configuration?: Json | null
          id?: string
          industry?: string | null
          integration_settings?: Json | null
          invoice_emails?: Json | null
          is_active?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          max_bottles?: number | null
          max_customers?: number | null
          max_cylinders?: number | null
          max_users?: number | null
          name: string
          order_number_format?: Json | null
          payment_method_id?: string | null
          payment_required?: boolean | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          rental_invoice_email_template?: Json | null
          secondary_color?: string | null
          serial_number_format?: Json | null
          settings?: Json | null
          show_app_icon?: boolean | null
          slug: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          active_discount_id?: string | null
          address?: string | null
          app_icon_url?: string | null
          app_name?: string | null
          asset_display_name?: string | null
          asset_display_name_plural?: string | null
          asset_type?: string | null
          asset_type_plural?: string | null
          barcode_format?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_terminology?: Json | null
          default_invoice_email?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          domain?: string | null
          email?: string | null
          email_from?: string | null
          email_password?: string | null
          email_user?: string | null
          feature_toggles?: Json | null
          format_configuration?: Json | null
          id?: string
          industry?: string | null
          integration_settings?: Json | null
          invoice_emails?: Json | null
          is_active?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          max_bottles?: number | null
          max_customers?: number | null
          max_cylinders?: number | null
          max_users?: number | null
          name?: string
          order_number_format?: Json | null
          payment_method_id?: string | null
          payment_required?: boolean | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          rental_invoice_email_template?: Json | null
          secondary_color?: string | null
          serial_number_format?: Json | null
          settings?: Json | null
          show_app_icon?: boolean | null
          slug?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_discount"
            columns: ["active_discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_organizations_subscription_plan"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_active_discount_id_fkey"
            columns: ["active_discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_values: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ownership_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          bounce: boolean | null
          created_at: string | null
          id: string
          organization_id: string
          page_id: string
          page_views: number | null
          referrer: string | null
          time_on_page: number | null
          user_agent: string | null
          visitor_ip: unknown
        }
        Insert: {
          bounce?: boolean | null
          created_at?: string | null
          id?: string
          organization_id: string
          page_id: string
          page_views?: number | null
          referrer?: string | null
          time_on_page?: number | null
          user_agent?: string | null
          visitor_ip?: unknown
        }
        Update: {
          bounce?: boolean | null
          created_at?: string | null
          id?: string
          organization_id?: string
          page_id?: string
          page_views?: number | null
          referrer?: string | null
          time_on_page?: number | null
          user_agent?: string | null
          visitor_ip?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "page_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "page_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_analytics_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "custom_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          template_content: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          template_content: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          template_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pallet_inspections: {
        Row: {
          condition: string
          corrective_actions: string | null
          created_at: string | null
          damage_description: string | null
          id: string
          inspection_date: string | null
          inspection_type: string
          inspector_id: string
          items_counted: boolean | null
          next_inspection_date: string | null
          organization_id: string
          pallet_id: string
          photos: Json | null
          safety_compliant: boolean | null
          weight_verified: boolean | null
        }
        Insert: {
          condition: string
          corrective_actions?: string | null
          created_at?: string | null
          damage_description?: string | null
          id?: string
          inspection_date?: string | null
          inspection_type: string
          inspector_id: string
          items_counted?: boolean | null
          next_inspection_date?: string | null
          organization_id: string
          pallet_id: string
          photos?: Json | null
          safety_compliant?: boolean | null
          weight_verified?: boolean | null
        }
        Update: {
          condition?: string
          corrective_actions?: string | null
          created_at?: string | null
          damage_description?: string | null
          id?: string
          inspection_date?: string | null
          inspection_type?: string
          inspector_id?: string
          items_counted?: boolean | null
          next_inspection_date?: string | null
          organization_id?: string
          pallet_id?: string
          photos?: Json | null
          safety_compliant?: boolean | null
          weight_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pallet_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inspections_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_items: {
        Row: {
          bottle_id: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          pallet_id: string
          position_x: number | null
          position_y: number | null
          position_z: number | null
          quantity: number | null
          scanned_at: string | null
          scanned_by: string
          updated_at: string | null
        }
        Insert: {
          bottle_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pallet_id: string
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          quantity?: number | null
          scanned_at?: string | null
          scanned_by: string
          updated_at?: string | null
        }
        Update: {
          bottle_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pallet_id?: string
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          quantity?: number | null
          scanned_at?: string | null
          scanned_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_items_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pallet_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_items_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_movements: {
        Row: {
          actual_arrival: string | null
          created_at: string | null
          expected_arrival: string | null
          from_location: string | null
          id: string
          moved_at: string | null
          moved_by: string
          movement_type: string
          notes: string | null
          organization_id: string
          pallet_id: string
          status: string
          to_location: string | null
        }
        Insert: {
          actual_arrival?: string | null
          created_at?: string | null
          expected_arrival?: string | null
          from_location?: string | null
          id?: string
          moved_at?: string | null
          moved_by: string
          movement_type: string
          notes?: string | null
          organization_id: string
          pallet_id: string
          status?: string
          to_location?: string | null
        }
        Update: {
          actual_arrival?: string | null
          created_at?: string | null
          expected_arrival?: string | null
          from_location?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          pallet_id?: string
          status?: string
          to_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pallet_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_templates: {
        Row: {
          created_at: string | null
          description: string | null
          dimensions: Json | null
          handling_instructions: Json | null
          id: string
          item_types: Json | null
          max_capacity: number
          name: string
          organization_id: string
          safety_requirements: Json | null
          updated_at: string | null
          weight_limit: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          handling_instructions?: Json | null
          id?: string
          item_types?: Json | null
          max_capacity?: number
          name: string
          organization_id: string
          safety_requirements?: Json | null
          updated_at?: string | null
          weight_limit?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          handling_instructions?: Json | null
          id?: string
          item_types?: Json | null
          max_capacity?: number
          name?: string
          organization_id?: string
          safety_requirements?: Json | null
          updated_at?: string | null
          weight_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pallet_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pallets: {
        Row: {
          barcode: string | null
          created_at: string | null
          created_by: string
          current_items: number | null
          description: string | null
          id: string
          location: string | null
          max_capacity: number
          name: string
          organization_id: string
          priority: string
          qr_code: string | null
          status: string
          template_id: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          created_by: string
          current_items?: number | null
          description?: string | null
          id?: string
          location?: string | null
          max_capacity?: number
          name: string
          organization_id: string
          priority?: string
          qr_code?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          created_by?: string
          current_items?: number | null
          description?: string | null
          id?: string
          location?: string | null
          max_capacity?: number
          name?: string
          organization_id?: string
          priority?: string
          qr_code?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pallet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_calculations: {
        Row: {
          base_cost: number
          calculated_by: string | null
          calculation_date: string | null
          customer_discount_amount: number | null
          customer_discount_percent: number | null
          customer_id: string | null
          demurrage_cost: number | null
          gas_type: string
          id: string
          is_estimate: boolean | null
          notes: string | null
          organization_id: string | null
          quantity: number
          rental_days: number
          rental_id: string | null
          subtotal: number
          tax_amount: number | null
          tier_applied: string | null
          total_amount: number
        }
        Insert: {
          base_cost?: number
          calculated_by?: string | null
          calculation_date?: string | null
          customer_discount_amount?: number | null
          customer_discount_percent?: number | null
          customer_id?: string | null
          demurrage_cost?: number | null
          gas_type: string
          id?: string
          is_estimate?: boolean | null
          notes?: string | null
          organization_id?: string | null
          quantity: number
          rental_days: number
          rental_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tier_applied?: string | null
          total_amount?: number
        }
        Update: {
          base_cost?: number
          calculated_by?: string | null
          calculation_date?: string | null
          customer_discount_amount?: number | null
          customer_discount_percent?: number | null
          customer_id?: string | null
          demurrage_cost?: number | null
          gas_type?: string
          id?: string
          is_estimate?: boolean | null
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          rental_days?: number
          rental_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tier_applied?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pricing_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          daily_rate: number
          gas_type: string
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number
          monthly_rate: number
          name: string
          organization_id: string | null
          updated_at: string | null
          weekly_rate: number
        }
        Insert: {
          created_at?: string | null
          daily_rate?: number
          gas_type?: string
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          monthly_rate?: number
          name: string
          organization_id?: string | null
          updated_at?: string | null
          weekly_rate?: number
        }
        Update: {
          created_at?: string | null
          daily_rate?: number
          gas_type?: string
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          monthly_rate?: number
          name?: string
          organization_id?: string | null
          updated_at?: string | null
          weekly_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          disabled_at: string | null
          disabled_reason: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          name: string | null
          organization_id: string | null
          preferences: Json | null
          role: string | null
          role_id: string | null
          theme_accent: string | null
          theme_mode: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          preferences?: Json | null
          role?: string | null
          role_id?: string | null
          theme_accent?: string | null
          theme_mode?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          preferences?: Json | null
          role?: string | null
          role_id?: string | null
          theme_accent?: string | null
          theme_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_requirements: {
        Row: {
          compliance_notes: string | null
          created_at: string | null
          description: string
          frequency: string | null
          id: string
          last_completed: string | null
          next_due: string | null
          organization_id: string
          regulatory_body: string
          requirement_name: string
          requirement_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          compliance_notes?: string | null
          created_at?: string | null
          description: string
          frequency?: string | null
          id?: string
          last_completed?: string | null
          next_due?: string | null
          organization_id: string
          regulatory_body: string
          requirement_name: string
          requirement_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          compliance_notes?: string | null
          created_at?: string | null
          description?: string
          frequency?: string | null
          id?: string
          last_completed?: string | null
          next_due?: string | null
          organization_id?: string
          regulatory_body?: string
          requirement_name?: string
          requirement_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "regulatory_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_calculations: {
        Row: {
          asset_id: string
          base_amount: number
          base_rate: number
          bracket_adjustment: number | null
          calculated_at: string | null
          calculated_by: string
          calculation_details: Json | null
          currency: string
          customer_id: string
          demurrage_amount: number | null
          end_date: string
          id: string
          organization_id: string
          rental_days: number
          start_date: string
          total_amount: number
        }
        Insert: {
          asset_id: string
          base_amount: number
          base_rate: number
          bracket_adjustment?: number | null
          calculated_at?: string | null
          calculated_by: string
          calculation_details?: Json | null
          currency?: string
          customer_id: string
          demurrage_amount?: number | null
          end_date: string
          id?: string
          organization_id: string
          rental_days: number
          start_date: string
          total_amount: number
        }
        Update: {
          asset_id?: string
          base_amount?: number
          base_rate?: number
          bracket_adjustment?: number | null
          calculated_at?: string | null
          calculated_by?: string
          calculation_details?: Json | null
          currency?: string
          customer_id?: string
          demurrage_amount?: number | null
          end_date?: string
          id?: string
          organization_id?: string
          rental_days?: number
          start_date?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rental_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rental_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_class_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_class_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_class_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_class_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rental_class_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_history: {
        Row: {
          actual_return_date: string | null
          asset_id: string
          created_at: string | null
          created_by: string
          currency: string
          customer_id: string
          expected_return_date: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_status: string | null
          rental_days: number | null
          rental_end_date: string | null
          rental_start_date: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          actual_return_date?: string | null
          asset_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          customer_id: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_status?: string | null
          rental_days?: number | null
          rental_end_date?: string | null
          rental_start_date: string
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          actual_return_date?: string | null
          asset_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          customer_id?: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_status?: string | null
          rental_days?: number | null
          rental_end_date?: string | null
          rental_start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rental_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_invoices: {
        Row: {
          created_at: string | null
          created_by: string
          currency: string
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_period_end: string | null
          invoice_period_start: string | null
          notes: string | null
          organization_id: string
          payment_terms: string | null
          rental_id: string
          status: string
          subtotal: number
          tax_amount: number | null
          template_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_period_end?: string | null
          invoice_period_start?: string | null
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          rental_id: string
          status?: string
          subtotal: number
          tax_amount?: number | null
          template_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_period_end?: string | null
          invoice_period_start?: string | null
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          rental_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          template_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rental_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_invoices_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rental_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_payments: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string
          payment_amount: number
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          processed_by: string
          rental_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id: string
          payment_amount: number
          payment_date: string
          payment_method?: string | null
          payment_reference?: string | null
          processed_by: string
          rental_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_amount?: number
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          processed_by?: string
          rental_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "rental_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rental_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rental_history"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_rates: {
        Row: {
          asset_type: string | null
          base_rate: number
          created_at: string | null
          created_by: string
          currency: string
          customer_type: string | null
          effective_date: string
          expiry_date: string | null
          grace_period: number | null
          id: string
          is_active: boolean | null
          maximum_rental_period: number | null
          minimum_rental_period: number | null
          organization_id: string
          rate_name: string
          rate_type: string
          updated_at: string | null
        }
        Insert: {
          asset_type?: string | null
          base_rate?: number
          created_at?: string | null
          created_by: string
          currency?: string
          customer_type?: string | null
          effective_date: string
          expiry_date?: string | null
          grace_period?: number | null
          id?: string
          is_active?: boolean | null
          maximum_rental_period?: number | null
          minimum_rental_period?: number | null
          organization_id: string
          rate_name: string
          rate_type?: string
          updated_at?: string | null
        }
        Update: {
          asset_type?: string | null
          base_rate?: number
          created_at?: string | null
          created_by?: string
          currency?: string
          customer_type?: string | null
          effective_date?: string
          expiry_date?: string | null
          grace_period?: number | null
          id?: string
          is_active?: boolean | null
          maximum_rental_period?: number | null
          minimum_rental_period?: number | null
          organization_id?: string
          rate_name?: string
          rate_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rental_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          billing_frequency: string | null
          bottle_barcode: string | null
          bottle_id: string | null
          closed_by_order: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_uuid: string | null
          cylinder_id: string | null
          dns_description: string | null
          dns_order_number: string | null
          dns_product_code: string | null
          id: string
          import_record_id: string | null
          is_dns: boolean | null
          last_billed_date: string | null
          lease_agreement_id: string | null
          location: string | null
          next_billing_date: string | null
          organization_id: string
          rental_amount: number | null
          rental_amount_manual: boolean
          rental_end_date: string | null
          rental_order_number: string | null
          rental_start_date: string
          rental_type: string
          status: string | null
          tax_code: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          billing_frequency?: string | null
          bottle_barcode?: string | null
          bottle_id?: string | null
          closed_by_order?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_uuid?: string | null
          cylinder_id?: string | null
          dns_description?: string | null
          dns_order_number?: string | null
          dns_product_code?: string | null
          id?: string
          import_record_id?: string | null
          is_dns?: boolean | null
          last_billed_date?: string | null
          lease_agreement_id?: string | null
          location?: string | null
          next_billing_date?: string | null
          organization_id: string
          rental_amount?: number | null
          rental_amount_manual?: boolean
          rental_end_date?: string | null
          rental_order_number?: string | null
          rental_start_date: string
          rental_type: string
          status?: string | null
          tax_code?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_frequency?: string | null
          bottle_barcode?: string | null
          bottle_id?: string | null
          closed_by_order?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_uuid?: string | null
          cylinder_id?: string | null
          dns_description?: string | null
          dns_order_number?: string | null
          dns_product_code?: string | null
          id?: string
          import_record_id?: string | null
          is_dns?: boolean | null
          last_billed_date?: string | null
          lease_agreement_id?: string | null
          location?: string | null
          next_billing_date?: string | null
          organization_id?: string
          rental_amount?: number | null
          rental_amount_manual?: boolean
          rental_end_date?: string | null
          rental_order_number?: string | null
          rental_start_date?: string
          rental_type?: string
          status?: string | null
          tax_code?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rentals_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "rentable_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_lease_agreement_id_fkey"
            columns: ["lease_agreement_id"]
            isOneToOne: false
            referencedRelation: "lease_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string | null
          id: string
          organization_id: string | null
          permissions: string[] | null
          role_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          organization_id?: string | null
          permissions?: string[] | null
          role_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          organization_id?: string | null
          permissions?: string[] | null
          role_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_orders: {
        Row: {
          address: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          gas_type: string | null
          id: string
          item: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          organization_id: string | null
          quantity: number | null
          returned_bottles: number | null
          sales_order_number: string | null
          scanned_at: string | null
          shipped_bottles: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          gas_type?: string | null
          id?: string
          item?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          organization_id?: string | null
          quantity?: number | null
          returned_bottles?: number | null
          sales_order_number?: string | null
          scanned_at?: string | null
          shipped_bottles?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          gas_type?: string | null
          id?: string
          item?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          organization_id?: string | null
          quantity?: number | null
          returned_bottles?: number | null
          sales_order_number?: string | null
          scanned_at?: string | null
          shipped_bottles?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      sales_track: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          id: number
          product_code: string | null
          quantity_in: number | null
          quantity_out: number | null
          sales_order: string | null
          transaction_date: string | null
        }
        Insert: {
          customer_id?: string | null
          customer_name?: string | null
          id?: number
          product_code?: string | null
          quantity_in?: number | null
          quantity_out?: number | null
          sales_order?: string | null
          transaction_date?: string | null
        }
        Update: {
          customer_id?: string | null
          customer_name?: string | null
          id?: number
          product_code?: string | null
          quantity_in?: number | null
          quantity_out?: number | null
          sales_order?: string | null
          transaction_date?: string | null
        }
        Relationships: []
      }
      scan_errors: {
        Row: {
          attempted_at: string | null
          barcode: string
          created_at: string | null
          error_message: string | null
          error_type: string
          id: string
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
        }
        Insert: {
          attempted_at?: string | null
          barcode: string
          created_at?: string | null
          error_message?: string | null
          error_type: string
          id?: string
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
        }
        Update: {
          attempted_at?: string | null
          barcode?: string
          created_at?: string | null
          error_message?: string | null
          error_type?: string
          id?: string
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_errors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_errors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_errors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scan_errors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_errors_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bulk_scan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          action: string
          barcode_number: string
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          location: string | null
          mode: string | null
          notes: string | null
          order_number: string | null
          organization_id: string | null
          product_code: string | null
          rejected_at: string | null
          rejected_by: string | null
          scanned_at: string | null
          scanned_by: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action: string
          barcode_number: string
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          location?: string | null
          mode?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          product_code?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action?: string
          barcode_number?: string
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          location?: string | null
          mode?: string | null
          notes?: string | null
          order_number?: string | null
          organization_id?: string | null
          product_code?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          created_at: string | null
          error_count: number | null
          id: string
          job_name: string
          last_error: string | null
          last_run: string | null
          next_run: string | null
          run_count: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          job_name: string
          last_error?: string | null
          last_run?: string | null
          next_run?: string | null
          run_count?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          job_name?: string
          last_error?: string | null
          last_run?: string | null
          next_run?: string | null
          run_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          logo_url: string | null
        }
        Insert: {
          id?: number
          logo_url?: string | null
        }
        Update: {
          id?: number
          logo_url?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          error: string | null
          external_id: string | null
          id: string
          message: string
          organization_id: string
          phone_number: string
          sent_at: string
          status: string
        }
        Insert: {
          error?: string | null
          external_id?: string | null
          id?: string
          message: string
          organization_id: string
          phone_number: string
          sent_at?: string
          status: string
        }
        Update: {
          error?: string | null
          external_id?: string | null
          id?: string
          message?: string
          organization_id?: string
          phone_number?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sms_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          is_most_popular: boolean | null
          max_customers: number | null
          max_cylinders: number
          max_users: number
          name: string
          price: number
          price_interval: string
          stripe_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features: Json
          id?: string
          is_active?: boolean | null
          is_most_popular?: boolean | null
          max_customers?: number | null
          max_cylinders: number
          max_users: number
          name: string
          price: number
          price_interval: string
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_most_popular?: boolean | null
          max_customers?: number | null
          max_cylinders?: number
          max_users?: number
          name?: string
          price?: number
          price_interval?: string
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          sender: string
          sender_email: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          sender: string
          sender_email?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          sender?: string
          sender_email?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          category: string
          closed_at: string | null
          created_at: string | null
          description: string
          id: string
          organization_id: string | null
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          category: string
          closed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          organization_id?: string | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          closed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_history: {
        Row: {
          asset_count: number
          asset_ids: Json
          created_at: string | null
          created_by_user_id: string | null
          from_customer_id: string
          from_customer_name: string
          id: string
          organization_id: string
          reason: string | null
          requires_inspection: boolean | null
          to_customer_id: string | null
          to_customer_name: string | null
          transfer_method: string | null
          transfer_type: string
          transferred_at: string
          wallet_hazardous: boolean | null
        }
        Insert: {
          asset_count: number
          asset_ids: Json
          created_at?: string | null
          created_by_user_id?: string | null
          from_customer_id: string
          from_customer_name: string
          id?: string
          organization_id: string
          reason?: string | null
          requires_inspection?: boolean | null
          to_customer_id?: string | null
          to_customer_name?: string | null
          transfer_method?: string | null
          transfer_type?: string
          transferred_at: string
          wallet_hazardous?: boolean | null
        }
        Update: {
          asset_count?: number
          asset_ids?: Json
          created_at?: string | null
          created_by_user_id?: string | null
          from_customer_id?: string
          from_customer_name?: string
          id?: string
          organization_id?: string
          reason?: string | null
          requires_inspection?: boolean | null
          to_customer_id?: string | null
          to_customer_name?: string | null
          transfer_method?: string | null
          transfer_type?: string
          transferred_at?: string
          wallet_hazardous?: boolean | null
        }
        Relationships: []
      }
      truck_maintenance: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          maintenance_type: string
          mileage_at_service: number | null
          next_service_due: string | null
          organization_id: string
          parts_replaced: string[] | null
          scheduled_date: string | null
          service_provider: string | null
          status: string | null
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_type: string
          mileage_at_service?: number | null
          next_service_due?: string | null
          organization_id: string
          parts_replaced?: string[] | null
          scheduled_date?: string | null
          service_provider?: string | null
          status?: string | null
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_type?: string
          mileage_at_service?: number | null
          next_service_due?: string | null
          organization_id?: string
          parts_replaced?: string[] | null
          scheduled_date?: string | null
          service_provider?: string | null
          status?: string | null
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_maintenance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "truck_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_maintenance_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_manifests: {
        Row: {
          actual_departure: string | null
          actual_return: string | null
          created_at: string | null
          delivered_items: number | null
          delivery_completed_at: string | null
          delivery_started_at: string | null
          driver_id: string
          estimated_return: string | null
          fuel_end: number | null
          fuel_start: number | null
          id: string
          loaded_items: number | null
          loading_completed_at: string | null
          loading_started_at: string | null
          manifest_number: string | null
          mileage_end: number | null
          mileage_start: number | null
          notes: string | null
          organization_id: string
          planned_departure: string | null
          reconciliation_completed_at: string | null
          returned_items: number | null
          route_name: string | null
          status: string | null
          total_items: number | null
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          actual_departure?: string | null
          actual_return?: string | null
          created_at?: string | null
          delivered_items?: number | null
          delivery_completed_at?: string | null
          delivery_started_at?: string | null
          driver_id: string
          estimated_return?: string | null
          fuel_end?: number | null
          fuel_start?: number | null
          id?: string
          loaded_items?: number | null
          loading_completed_at?: string | null
          loading_started_at?: string | null
          manifest_number?: string | null
          mileage_end?: number | null
          mileage_start?: number | null
          notes?: string | null
          organization_id: string
          planned_departure?: string | null
          reconciliation_completed_at?: string | null
          returned_items?: number | null
          route_name?: string | null
          status?: string | null
          total_items?: number | null
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          actual_departure?: string | null
          actual_return?: string | null
          created_at?: string | null
          delivered_items?: number | null
          delivery_completed_at?: string | null
          delivery_started_at?: string | null
          driver_id?: string
          estimated_return?: string | null
          fuel_end?: number | null
          fuel_start?: number | null
          id?: string
          loaded_items?: number | null
          loading_completed_at?: string | null
          loading_started_at?: string | null
          manifest_number?: string | null
          mileage_end?: number | null
          mileage_start?: number | null
          notes?: string | null
          organization_id?: string
          planned_departure?: string | null
          reconciliation_completed_at?: string | null
          returned_items?: number | null
          route_name?: string | null
          status?: string | null
          total_items?: number | null
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_manifests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "truck_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_manifests_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          capacity_volume: number | null
          capacity_weight: number | null
          created_at: string | null
          current_driver_id: string | null
          current_manifest_id: string | null
          fuel_level: number | null
          fuel_type: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          last_location_update: string | null
          last_maintenance_date: string | null
          license_plate: string
          make: string | null
          mileage: number | null
          model: string | null
          next_maintenance_date: string | null
          organization_id: string
          status: string | null
          updated_at: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          capacity_volume?: number | null
          capacity_weight?: number | null
          created_at?: string | null
          current_driver_id?: string | null
          current_manifest_id?: string | null
          fuel_level?: number | null
          fuel_type?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          last_location_update?: string | null
          last_maintenance_date?: string | null
          license_plate: string
          make?: string | null
          mileage?: number | null
          model?: string | null
          next_maintenance_date?: string | null
          organization_id: string
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          capacity_volume?: number | null
          capacity_weight?: number | null
          created_at?: string | null
          current_driver_id?: string | null
          current_manifest_id?: string | null
          fuel_level?: number | null
          fuel_type?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          last_location_update?: string | null
          last_maintenance_date?: string | null
          license_plate?: string
          make?: string | null
          mileage?: number | null
          model?: string | null
          next_maintenance_date?: string | null
          organization_id?: string
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "trucks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_model: string | null
          device_token: string
          id: string
          is_active: boolean
          last_seen: string | null
          organization_id: string
          os_version: string | null
          platform: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_model?: string | null
          device_token: string
          id?: string
          is_active?: boolean
          last_seen?: string | null
          organization_id: string
          os_version?: string | null
          platform: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_model?: string | null
          device_token?: string
          id?: string
          is_active?: boolean
          last_seen?: string | null
          organization_id?: string
          os_version?: string | null
          platform?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          error: string | null
          event: string
          id: string
          response_body: string | null
          response_code: number | null
          sent_at: string
          status: string
          webhook_id: string
        }
        Insert: {
          error?: string | null
          event: string
          id?: string
          response_body?: string | null
          response_code?: number | null
          sent_at?: string
          status: string
          webhook_id: string
        }
        Update: {
          error?: string | null
          event?: string
          id?: string
          response_body?: string | null
          response_code?: number | null
          sent_at?: string
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: Json
          id: string
          is_active: boolean
          name: string
          organization_id: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_join_codes: {
        Row: {
          code: string | null
          created_at: string | null
          created_by_name: string | null
          current_uses: number | null
          expires_at: string | null
          id: string | null
          max_uses: number | null
          notes: string | null
          organization_id: string | null
          organization_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      active_organizations: {
        Row: {
          active_discount_id: string | null
          app_name: string | null
          asset_display_name: string | null
          asset_display_name_plural: string | null
          asset_type: string | null
          asset_type_plural: string | null
          barcode_format: Json | null
          created_at: string | null
          custom_terminology: Json | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          domain: string | null
          email: string | null
          email_from: string | null
          email_password: string | null
          email_user: string | null
          feature_toggles: Json | null
          format_configuration: Json | null
          id: string | null
          integration_settings: Json | null
          is_active: boolean | null
          join_code: string | null
          logo_url: string | null
          max_bottles: number | null
          max_customers: number | null
          max_cylinders: number | null
          max_users: number | null
          name: string | null
          order_number_format: Json | null
          payment_method_id: string | null
          payment_required: boolean | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          serial_number_format: Json | null
          settings: Json | null
          slug: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          subscription_plan_id: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          trial_end_date: string | null
          trial_ends_at: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          active_discount_id?: string | null
          app_name?: string | null
          asset_display_name?: string | null
          asset_display_name_plural?: string | null
          asset_type?: string | null
          asset_type_plural?: string | null
          barcode_format?: Json | null
          created_at?: string | null
          custom_terminology?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          domain?: string | null
          email?: string | null
          email_from?: string | null
          email_password?: string | null
          email_user?: string | null
          feature_toggles?: Json | null
          format_configuration?: Json | null
          id?: string | null
          integration_settings?: Json | null
          is_active?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          max_bottles?: number | null
          max_customers?: number | null
          max_cylinders?: number | null
          max_users?: number | null
          name?: string | null
          order_number_format?: Json | null
          payment_method_id?: string | null
          payment_required?: boolean | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          serial_number_format?: Json | null
          settings?: Json | null
          slug?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          active_discount_id?: string | null
          app_name?: string | null
          asset_display_name?: string | null
          asset_display_name_plural?: string | null
          asset_type?: string | null
          asset_type_plural?: string | null
          barcode_format?: Json | null
          created_at?: string | null
          custom_terminology?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          domain?: string | null
          email?: string | null
          email_from?: string | null
          email_password?: string | null
          email_user?: string | null
          feature_toggles?: Json | null
          format_configuration?: Json | null
          id?: string | null
          integration_settings?: Json | null
          is_active?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          max_bottles?: number | null
          max_customers?: number | null
          max_cylinders?: number | null
          max_users?: number | null
          name?: string | null
          order_number_format?: Json | null
          payment_method_id?: string | null
          payment_required?: boolean | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          serial_number_format?: Json | null
          settings?: Json | null
          slug?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_discount"
            columns: ["active_discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_organizations_subscription_plan"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_active_discount_id_fkey"
            columns: ["active_discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bottles_with_status: {
        Row: {
          asset_status: string | null
          assigned_customer: string | null
          assigned_customer_name: string | null
          barcode_number: string | null
          category: string | null
          created_at: string | null
          customer_name: string | null
          customer_type: string | null
          customer_uuid: string | null
          CustomerListID: string | null
          days_at_location: number | null
          description: string | null
          dock_stock: string | null
          gas_type: string | null
          group_name: string | null
          id: string | null
          in_house_total: number | null
          last_location_update: string | null
          location: string | null
          lost_total: number | null
          organization_id: string | null
          owner_id: string | null
          owner_name: string | null
          owner_type: string | null
          ownership: string | null
          product_code: string | null
          rental_start_date: string | null
          serial_number: string | null
          status: string | null
          status_description: string | null
          total: number | null
          type: string | null
          with_customer_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bottles_assigned_customer_fkey"
            columns: ["assigned_customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["CustomerListID"]
          },
          {
            foreignKeyName: "bottles_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_organizations: {
        Row: {
          active_discount_id: string | null
          app_name: string | null
          asset_display_name: string | null
          asset_display_name_plural: string | null
          asset_type: string | null
          asset_type_plural: string | null
          barcode_format: Json | null
          created_at: string | null
          custom_terminology: Json | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          domain: string | null
          email: string | null
          email_from: string | null
          email_password: string | null
          email_user: string | null
          feature_toggles: Json | null
          format_configuration: Json | null
          id: string | null
          integration_settings: Json | null
          is_active: boolean | null
          join_code: string | null
          logo_url: string | null
          max_bottles: number | null
          max_customers: number | null
          max_cylinders: number | null
          max_users: number | null
          name: string | null
          order_number_format: Json | null
          payment_method_id: string | null
          payment_required: boolean | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          serial_number_format: Json | null
          settings: Json | null
          slug: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          subscription_plan_id: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          trial_end_date: string | null
          trial_ends_at: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          active_discount_id?: string | null
          app_name?: string | null
          asset_display_name?: string | null
          asset_display_name_plural?: string | null
          asset_type?: string | null
          asset_type_plural?: string | null
          barcode_format?: Json | null
          created_at?: string | null
          custom_terminology?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          domain?: string | null
          email?: string | null
          email_from?: string | null
          email_password?: string | null
          email_user?: string | null
          feature_toggles?: Json | null
          format_configuration?: Json | null
          id?: string | null
          integration_settings?: Json | null
          is_active?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          max_bottles?: number | null
          max_customers?: number | null
          max_cylinders?: number | null
          max_users?: number | null
          name?: string | null
          order_number_format?: Json | null
          payment_method_id?: string | null
          payment_required?: boolean | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          serial_number_format?: Json | null
          settings?: Json | null
          slug?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          active_discount_id?: string | null
          app_name?: string | null
          asset_display_name?: string | null
          asset_display_name_plural?: string | null
          asset_type?: string | null
          asset_type_plural?: string | null
          barcode_format?: Json | null
          created_at?: string | null
          custom_terminology?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          domain?: string | null
          email?: string | null
          email_from?: string | null
          email_password?: string | null
          email_user?: string | null
          feature_toggles?: Json | null
          format_configuration?: Json | null
          id?: string | null
          integration_settings?: Json | null
          is_active?: boolean | null
          join_code?: string | null
          logo_url?: string | null
          max_bottles?: number | null
          max_customers?: number | null
          max_cylinders?: number | null
          max_users?: number | null
          name?: string | null
          order_number_format?: Json | null
          payment_method_id?: string | null
          payment_required?: boolean | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          serial_number_format?: Json | null
          settings?: Json | null
          slug?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_plan_id?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_discount"
            columns: ["active_discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_organizations_subscription_plan"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_active_discount_id_fkey"
            columns: ["active_discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_dashboard_stats: {
        Row: {
          collection_rate: number | null
          organization_id: string | null
          outstanding_amount: number | null
          overdue_invoices: number | null
          paid_invoices: number | null
          total_invoices: number | null
          total_revenue: number | null
          unpaid_invoices: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "active_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "deleted_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_usage"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_usage: {
        Row: {
          current_customers: number | null
          current_cylinders: number | null
          current_users: number | null
          max_customers: number | null
          max_cylinders: number | null
          max_users: number | null
          organization_id: string | null
          organization_name: string | null
          slug: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_status: string | null
        }
        Relationships: []
      }
      rentable_assignments: {
        Row: {
          assigned_customer: string | null
          assigned_customer_name: string | null
          barcode_number: string | null
          category: string | null
          created_at: string | null
          customer_name: string | null
          customer_type: string | null
          customer_uuid: string | null
          CustomerListID: string | null
          days_at_location: number | null
          description: string | null
          dock_stock: string | null
          gas_type: string | null
          group_name: string | null
          id: string | null
          in_house_total: number | null
          last_location_update: string | null
          location: string | null
          lost_total: number | null
          organization_id: string | null
          owner_id: string | null
          owner_name: string | null
          owner_type: string | null
          ownership: string | null
          product_code: string | null
          rental_start_date: string | null
          serial_number: string | null
          status: string | null
          total: number | null
          type: string | null
          with_customer_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bottles_assigned_customer_fkey"
            columns: ["assigned_customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["CustomerListID"]
          },
          {
            foreignKeyName: "bottles_customer_uuid_fkey"
            columns: ["customer_uuid"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_organization_invite: {
        Args: { p_token: string }
        Returns: boolean
      }
      admin_cleanup_join_codes: {
        Args: { p_days_old?: number; p_organization_id?: string }
        Returns: {
          deleted_count: number
          message: string
        }[]
      }
      apply_bracket_rates: {
        Args: { p_bracket_rate_id: string; p_rental_days: number }
        Returns: number
      }
      assign_bottles_to_customer: {
        Args: {
          p_customer_id: string
          p_customer_name: string
          p_default_rental_amount?: number
          p_default_tax_rate?: number
          p_import_record_id?: string
          p_import_table?: string
          p_order_number?: string
          p_organization_id: string
          p_return_barcodes: string[]
          p_ship_barcodes: string[]
          p_user_id?: string
        }
        Returns: Json
      }
      auth_user_organization_id: { Args: never; Returns: string }
      backup_all_organizations: { Args: never; Returns: Json }
      calculate_demurrage: {
        Args: {
          p_base_rate: number
          p_end_date: string
          p_escalation_rate?: number
          p_grace_period?: number
          p_maximum_rate?: number
          p_start_date: string
        }
        Returns: number
      }
      calculate_next_billing_date: {
        Args: { frequency: string; start_date: string }
        Returns: string
      }
      calculate_rental_amount: {
        Args: {
          p_base_rate: number
          p_end_date: string
          p_rate_type?: string
          p_start_date: string
        }
        Returns: number
      }
      cleanup_expired_join_codes: { Args: never; Returns: number }
      cleanup_old_backups: { Args: { days_to_keep?: number }; Returns: Json }
      cleanup_old_join_codes: { Args: { p_days_old?: number }; Returns: number }
      cleanup_old_user_devices: { Args: never; Returns: undefined }
      create_custody_event: {
        Args: {
          p_custody_id: string
          p_description: string
          p_event_type: string
          p_performed_by?: string
        }
        Returns: string
      }
      create_default_backup_schedule: {
        Args: { org_id: string }
        Returns: undefined
      }
      create_organization_backup: {
        Args: { backup_type_param?: string; org_id: string }
        Returns: Json
      }
      create_organization_invite: {
        Args: {
          p_email: string
          p_expires_in_days?: number
          p_organization_id: string
          p_role: string
        }
        Returns: {
          id: string
          invite_token: string
        }[]
      }
      create_organization_join_code: {
        Args: {
          p_assigned_role?: string
          p_created_by: string
          p_expires_hours?: number
          p_max_uses?: number
          p_notes?: string
          p_organization_id: string
        }
        Returns: {
          assigned_role: string
          expires_at: string
          id: string
          join_code: string
        }[]
      }
      create_user_invite: {
        Args: {
          p_email: string
          p_invited_by: string
          p_organization_id: string
          p_role: string
        }
        Returns: string
      }
      create_verified_organization: {
        Args: { p_user_id: string; p_verification_token: string }
        Returns: string
      }
      generate_agreement_number: { Args: { org_id: string }; Returns: string }
      generate_custody_report: {
        Args: { p_custody_id: string }
        Returns: {
          asset_id: string
          custody_id: string
          custody_type: string
          from_party: string
          status: string
          to_party: string
          total_documents: number
          total_events: number
          total_signatures: number
          transfer_date: string
        }[]
      }
      generate_invite_token: { Args: never; Returns: string }
      generate_numeric_join_code: { Args: never; Returns: string }
      generate_unique_slug: {
        Args: { p_organization_id: string; p_title: string }
        Returns: string
      }
      get_asset_status: {
        Args: { assigned_customer: string; customer_type: string }
        Returns: string
      }
      get_backup_status: {
        Args: never
        Returns: {
          backup_size_mb: number
          bottles_count: number
          customers_count: number
          days_since_backup: number
          last_backup_date: string
          last_backup_status: string
          next_backup: string
          organization_id: string
          organization_name: string
          schedule_active: boolean
        }[]
      }
      get_customer_with_branches: {
        Args: { customer_uuid: string }
        Returns: {
          account_type: string
          branch_count: number
          customerlistid: string
          id: string
          name: string
          parent_customer_id: string
        }[]
      }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_at: string
          organization_id: string
          organization_name: string
          role: string
        }[]
      }
      get_my_organization_id: { Args: never; Returns: string }
      get_organization_backup_history: {
        Args: { days_back?: number; org_id: string }
        Returns: {
          backup_date: string
          backup_size_mb: number
          backup_status: string
          backup_type: string
          bottles_count: number
          completed_at: string
          created_at: string
          customers_count: number
          error_message: string
        }[]
      }
      get_organization_join_codes: {
        Args: { p_organization_id: string }
        Returns: {
          code: string
          created_at: string
          created_by_name: string
          current_uses: number
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
          notes: string
        }[]
      }
      get_page_statistics: {
        Args: { p_organization_id: string }
        Returns: {
          avg_time_on_page: number
          draft_pages: number
          published_pages: number
          total_pages: number
          total_views: number
        }[]
      }
      get_pending_invites: {
        Args: { p_organization_id: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_at: string
          organization_id: string
          role: string
        }[]
      }
      get_role_id_by_name: { Args: { role_name: string }; Returns: string }
      get_tenant_summaries: {
        Args: { p_org_ids: string[] }
        Returns: {
          bottle_count: number
          contact_email: string
          customer_count: number
          organization_id: string
          user_count: number
        }[]
      }
      get_user_basic: {
        Args: { p_user_id: string }
        Returns: {
          email: string
          id: string
        }[]
      }
      initialize_days_at_location: {
        Args: { bottle_id: string }
        Returns: undefined
      }
      initialize_rental_billing_dates: { Args: never; Returns: undefined }
      is_in_organization: { Args: { org_id: string }; Returns: boolean }
      is_platform_owner: { Args: never; Returns: boolean }
      normalize_role_name: { Args: { input_role: string }; Returns: string }
      regenerate_join_code: { Args: { org_id: string }; Returns: string }
      request_organization_verification: {
        Args: {
          p_email: string
          p_organization_name: string
          p_user_name: string
        }
        Returns: string
      }
      reserve_invoice_numbers: {
        Args: { p_count?: number; p_organization_id: string }
        Returns: string[]
      }
      reset_days_at_location: {
        Args: { bottle_id: string }
        Returns: undefined
      }
      return_bottles_to_warehouse: {
        Args: {
          p_bottle_ids: string[]
          p_organization_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      run_scheduled_backups: { Args: never; Returns: Json }
      run_scheduled_jobs: { Args: never; Returns: undefined }
      unverify_order: {
        Args: {
          p_import_record_id: string
          p_import_table?: string
          p_order_number?: string
          p_organization_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      update_bottle_scans_customer: {
        Args: {
          p_customer_id: string
          p_customer_name: string
          p_order_number: string
          p_org_id: string
        }
        Returns: Json
      }
      update_days_at_location_daily: { Args: never; Returns: undefined }
      update_scans_order_number: {
        Args: { p_new_order: string; p_old_order: string; p_org_id: string }
        Returns: Json
      }
      use_organization_join_code: {
        Args: { p_code: string; p_used_by: string }
        Returns: {
          assigned_role: string
          message: string
          organization_id: string
          success: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
