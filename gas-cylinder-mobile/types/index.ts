// Type definitions for the gas cylinder app

export interface Customer {
  CustomerListID: string;
  name: string;
  barcode?: string;
  customer_name?: string;
  id?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  role?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  organization_id?: string;
}

export interface AssetConfig {
  assetType: string;
  assetTypePlural: string;
  assetDisplayName: string;
  assetDisplayNamePlural: string;
  primaryColor: string;
  secondaryColor: string;
  appName: string;
  customTerminology: Record<string, string>;
  featureToggles: Record<string, boolean>;
  orderNumberFormat?: {
    description: string;
    examples: string[];
  };
  barcodeFormat?: {
    description: string;
  };
}

export interface OrganizationFormats {
  barcode_format: FormatConfig;
  order_number_format: FormatConfig;
  customer_id_format: FormatConfig;
  cylinder_serial_format: FormatConfig;
}

export interface FormatConfig {
  pattern: string;
  description: string;
  examples: string[];
  prefix?: string;
  validation_enabled: boolean;
}

export interface FeedbackType {
  scan_success: string;
  scan_error: string;
}

export interface FeedbackService {
  playSound(type: FeedbackType): Promise<void>;
}

export interface Colors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  border: string;
  shadow: string;
  cardBackground: string;
  danger?: string;
  statusBar: 'dark-content' | 'light-content';
}

export interface SyncResult {
  success: boolean;
  errors: string[];
  syncedCount: number;
}

export interface LocationOptions {
  accuracy?: number;
  timeout?: number;
  maximumAge?: number;
}

export interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  details?: {
    strength?: number;
  };
}

export interface OfflineData {
  bottles: any[];
  customers: any[];
  rentals: any[];
  fills: any[];
  synced: boolean;
}

export interface CachedData {
  bottles: any[];
  customers: any[];
  rentals: any[];
  lastSync: number;
  organizationId: string;
}
