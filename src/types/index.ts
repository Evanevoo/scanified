/**
 * TypeScript type definitions for Gas Cylinder Management System
 * Provides type safety and better development experience
 */

// =============================================================================
// BASE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationEntity extends BaseEntity {
  organization_id: string;
}

// =============================================================================
// USER & AUTHENTICATION TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_change_sent_at?: string;
  new_email?: string;
  invited_at?: string;
  action_link?: string;
  email_change?: string;
  email_change_token?: string;
  phone_change?: string;
  phone_change_token?: string;
  phone_change_sent_at?: string;
  confirmed_at?: string;
  email_change_confirm_status?: number;
  banned_until?: string;
  is_sso_user?: boolean;
  deleted_at?: string;
  is_anonymous?: boolean;
}

export interface Profile extends BaseEntity {
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  title?: string;
  department?: string;
  is_active: boolean;
  last_login_at?: string;
  preferences?: Record<string, any>;
  deleted_at?: string;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  industry?: string;
  size?: string;
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  subscription_plan?: string;
  subscription_end_date?: string;
  max_users?: number;
  max_cylinders?: number;
  max_customers?: number;
  is_active: boolean;
  settings?: Record<string, any>;
  deleted_at?: string;
}

// =============================================================================
// ASSET TYPES
// =============================================================================

export interface Bottle extends OrganizationEntity {
  serial_number?: string;
  barcode_number?: string;
  product_code?: string;
  description?: string;
  size?: string;
  type?: string;
  gas_type?: string;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  location?: string;
  customer_name?: string;
  assigned_customer?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  last_inspection_date?: string;
  next_inspection_date?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  images?: string[];
  maintenance_history?: MaintenanceRecord[];
}

export interface AssetType extends OrganizationEntity {
  name: string;
  description?: string;
  category: string;
  size?: string;
  weight?: number;
  dimensions?: string;
  material?: string;
  pressure_rating?: number;
  color?: string;
  is_active: boolean;
  rental_rate?: number;
  purchase_price?: number;
  maintenance_interval_days?: number;
  inspection_required: boolean;
  hazmat_classification?: string;
  compliance_requirements?: string[];
}

// =============================================================================
// CUSTOMER TYPES
// =============================================================================

export interface Customer extends OrganizationEntity {
  CustomerListID: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  billing_address?: string;
  shipping_address?: string;
  payment_terms?: string;
  credit_limit?: number;
  tax_id?: string;
  industry?: string;
  customer_type: 'individual' | 'business' | 'government';
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_by?: string;
  last_contact_date?: string;
  total_rentals?: number;
  total_value?: number;
  payment_history?: PaymentRecord[];
  rental_history?: RentalRecord[];
}

// =============================================================================
// RENTAL TYPES
// =============================================================================

export interface RentalRecord extends OrganizationEntity {
  customer_id: string;
  bottle_id: string;
  rental_start_date: string;
  rental_end_date?: string;
  daily_rate: number;
  total_amount?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  updated_by?: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_due_date?: string;
  late_fees?: number;
  customer?: Customer;
  bottle?: Bottle;
}

export interface RentalRate extends OrganizationEntity {
  asset_type_id: string;
  customer_id?: string;
  daily_rate: number;
  weekly_rate?: number;
  monthly_rate?: number;
  minimum_rental_days: number;
  late_fee_per_day: number;
  deposit_required: number;
  is_active: boolean;
  effective_date: string;
  expiry_date?: string;
  notes?: string;
  created_by: string;
  asset_type?: AssetType;
  customer?: Customer;
}

// =============================================================================
// MAINTENANCE TYPES
// =============================================================================

export interface MaintenanceRecord extends OrganizationEntity {
  bottle_id: string;
  maintenance_type: 'inspection' | 'repair' | 'cleaning' | 'calibration' | 'replacement';
  description: string;
  performed_by: string;
  performed_date: string;
  next_maintenance_date?: string;
  cost?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  attachments?: string[];
  bottle?: Bottle;
  technician?: Profile;
}

export interface MaintenanceWorkflow extends OrganizationEntity {
  name: string;
  description?: string;
  asset_type_id?: string;
  trigger_conditions: string[];
  steps: MaintenanceStep[];
  is_active: boolean;
  created_by: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_duration_hours?: number;
  required_skills?: string[];
  safety_requirements?: string[];
  asset_type?: AssetType;
  assigned_user?: Profile;
  created_user?: Profile;
}

export interface MaintenanceStep extends BaseEntity {
  workflow_id: string;
  step_number: number;
  title: string;
  description: string;
  instructions: string;
  estimated_duration_minutes: number;
  required_tools?: string[];
  safety_notes?: string;
  is_required: boolean;
  dependencies?: string[];
  workflow?: MaintenanceWorkflow;
}

// =============================================================================
// DELIVERY TYPES
// =============================================================================

export interface Delivery extends OrganizationEntity {
  customer_id: string;
  delivery_date: string;
  delivery_address: string;
  contact_person?: string;
  contact_phone?: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  driver_id?: string;
  vehicle_id?: string;
  route_id?: string;
  delivery_notes?: string;
  signature?: string;
  photos?: string[];
  delivery_time?: string;
  customer?: Customer;
  driver?: Profile;
  vehicle?: Vehicle;
  route?: DeliveryRoute;
  items?: DeliveryItem[];
}

export interface DeliveryItem extends BaseEntity {
  delivery_id: string;
  bottle_id: string;
  quantity: number;
  action: 'deliver' | 'pickup' | 'exchange';
  notes?: string;
  delivery?: Delivery;
  bottle?: Bottle;
}

export interface DeliveryRoute extends OrganizationEntity {
  name: string;
  description?: string;
  driver_id?: string;
  vehicle_id?: string;
  start_location: string;
  end_location: string;
  estimated_duration_hours: number;
  distance_miles?: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  scheduled_date: string;
  completed_date?: string;
  notes?: string;
  driver?: Profile;
  vehicle?: Vehicle;
  deliveries?: Delivery[];
}

// =============================================================================
// VEHICLE TYPES
// =============================================================================

export interface Vehicle extends OrganizationEntity {
  name: string;
  type: 'truck' | 'van' | 'car' | 'motorcycle';
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  capacity?: number;
  fuel_type?: string;
  is_active: boolean;
  current_driver_id?: string;
  maintenance_schedule?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  notes?: string;
  current_driver?: Profile;
}

// =============================================================================
// INVOICE TYPES
// =============================================================================

export interface Invoice extends OrganizationEntity {
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_terms?: string;
  notes?: string;
  created_by: string;
  customer?: Customer;
  items?: InvoiceItem[];
  payments?: PaymentRecord[];
}

export interface InvoiceItem extends BaseEntity {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  bottle_id?: string;
  rental_id?: string;
  invoice?: Invoice;
  bottle?: Bottle;
  rental?: RentalRecord;
}

export interface PaymentRecord extends BaseEntity {
  invoice_id?: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  reference_number?: string;
  notes?: string;
  created_by: string;
  invoice?: Invoice;
  customer?: Customer;
}

// =============================================================================
// IMPORT TYPES
// =============================================================================

export interface ImportRecord extends OrganizationEntity {
  filename: string;
  file_type: 'excel' | 'csv' | 'json';
  import_type: 'bottles' | 'customers' | 'rentals' | 'invoices';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  error_rows: number;
  error_details?: string;
  created_by: string;
  started_at?: string;
  completed_at?: string;
  file_url?: string;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  start_date: string;
  end_date: string;
  metrics: {
    total_bottles: number;
    active_rentals: number;
    total_revenue: number;
    new_customers: number;
    maintenance_alerts: number;
    delivery_completions: number;
  };
  trends: {
    revenue_growth: number;
    customer_growth: number;
    rental_utilization: number;
    maintenance_costs: number;
  };
  charts: {
    revenue_chart: ChartData[];
    rental_chart: ChartData[];
    customer_chart: ChartData[];
    maintenance_chart: ChartData[];
  };
}

export interface ChartData {
  label: string;
  value: number;
  date: string;
  color?: string;
}

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface OrganizationSettings extends BaseEntity {
  organization_id: string;
  settings: {
    general: {
      timezone: string;
      date_format: string;
      currency: string;
      language: string;
    };
    notifications: {
      email_enabled: boolean;
      sms_enabled: boolean;
      push_enabled: boolean;
      notification_types: string[];
    };
    billing: {
      billing_cycle: 'monthly' | 'quarterly' | 'annually';
      payment_terms: number;
      late_fee_percentage: number;
      tax_rate: number;
    };
    maintenance: {
      inspection_interval_days: number;
      maintenance_reminder_days: number;
      auto_schedule_maintenance: boolean;
    };
    security: {
      session_timeout_minutes: number;
      require_2fa: boolean;
      password_policy: string;
    };
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  helperText?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  chip?: boolean;
  chipColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  user_id?: string;
  organization_id?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  user_id: string;
  organization_id: string;
  action_url?: string;
  action_text?: string;
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export type {
  BaseEntity,
  OrganizationEntity,
  User,
  Profile,
  Organization,
  Bottle,
  AssetType,
  Customer,
  RentalRecord,
  RentalRate,
  MaintenanceRecord,
  MaintenanceWorkflow,
  MaintenanceStep,
  Delivery,
  DeliveryItem,
  DeliveryRoute,
  Vehicle,
  Invoice,
  InvoiceItem,
  PaymentRecord,
  ImportRecord,
  AnalyticsData,
  ChartData,
  OrganizationSettings,
  ApiResponse,
  PaginatedResponse,
  FormField,
  FormState,
  TableColumn,
  PaginationProps,
  SearchProps,
  AppError,
  ValidationError,
  Notification
};
