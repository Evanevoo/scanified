import logger from './utils/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

// Configuration error state - used to show user-friendly error instead of crashing
let configurationError: string | null = null;

// Get values from config
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug logging (only in development)
if (__DEV__) {
  logger.log('📋 Supabase Config Check:', {
    hasExpoConfig: !!Constants.expoConfig,
    hasExtra: !!Constants.expoConfig?.extra,
    urlLength: supabaseUrl.length,
    keyLength: supabaseAnonKey.length,
    urlPreview: supabaseUrl.substring(0, 30) + '...',
    keyPreview: supabaseAnonKey.substring(0, 30) + '...',
  });
}

// Check if values are unresolved template variables or empty
const isUnresolved = (value: string) => !value || value === '' || value.includes('${');

// Validate configuration
const validateConfiguration = (): boolean => {
  const missingVars: string[] = [];
  
  if (isUnresolved(supabaseUrl)) {
    missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  
  if (isUnresolved(supabaseAnonKey)) {
    missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  if (missingVars.length > 0) {
    configurationError = `Missing required configuration: ${missingVars.join(', ')}. Please configure these values in your app.json extra section or EAS Secrets.`;
    logger.error('❌ Supabase configuration error:', configurationError);
    return false;
  }
  
  // Validate URL format
  if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
    configurationError = 'Invalid Supabase URL format. URL must start with https:// or http://';
    logger.error('❌ Supabase URL validation error:', configurationError);
    return false;
  }
  
  // Validate anon key format (JWT tokens have 3 parts separated by dots)
  const keyParts = supabaseAnonKey.split('.');
  if (keyParts.length !== 3) {
    configurationError = 'Invalid Supabase anon key format. Key must be a valid JWT token.';
    logger.error('❌ Supabase key validation error:', configurationError);
    return false;
  }
  
  return true;
};

// Create a dummy client that throws helpful errors if configuration is invalid
const createDummyClient = (): SupabaseClient => {
  const errorMessage = configurationError || 'Supabase is not configured';
  
  // Helper function to create error-returning query builder that supports method chaining
  const createErrorQueryBuilder = () => {
    // Methods that should return a Promise (execution methods)
    const executionMethods = ['single', 'maybeSingle', 'then', 'catch', 'finally'];
    
    const errorHandler: ProxyHandler<any> = {
      get: (_target, prop) => {
        const propStr = String(prop);
        
        // For execution methods, return a function that returns a rejected Promise
        if (executionMethods.includes(propStr)) {
          return (..._args: any[]) => {
            logger.error(`❌ Supabase operation failed: ${errorMessage}`);
            return Promise.resolve({ data: null, error: new Error(errorMessage) });
          };
        }
        
        // For chaining methods (select, insert, update, delete, eq, order, limit, etc.)
        // Return a function that returns the same query builder to allow chaining
        return (..._args: any[]) => {
          // Only log on the first method call to avoid spam
          if (propStr === 'select' || propStr === 'insert' || propStr === 'update' || propStr === 'delete') {
            logger.error(`❌ Supabase operation failed: ${errorMessage}`);
          }
          // Return the same query builder to allow chaining
          return createErrorQueryBuilder();
        };
      }
    };
    return new Proxy({}, errorHandler);
  };
  
  // Create a proxy that throws helpful errors
  const handler: ProxyHandler<any> = {
    get: (_target, prop) => {
      // For 'from', return a function that returns a query builder
      if (prop === 'from') {
        return (table: string) => {
          logger.error(`❌ Supabase operation failed: ${errorMessage}`);
          return createErrorQueryBuilder();
        };
      }
      
      // For 'auth', return an object with auth methods and properties
      if (prop === 'auth') {
        const authHandler: ProxyHandler<any> = {
          get: (_target, authProp) => {
            const authPropStr = String(authProp);
            
            // Handle property access (session, user, etc.)
            if (authPropStr === 'session' || authPropStr === 'user') {
              logger.error(`❌ Supabase auth property access failed: ${errorMessage}`);
              return null;
            }
            
            // Handle method calls (getSession, getUser, signIn, signOut, etc.)
            return async (..._args: any[]) => {
              logger.error(`❌ Supabase auth operation failed: ${errorMessage}`);
              
              // Show alert on first failed operation (only once)
              if (configurationError && !globalThis.__supabaseErrorShown) {
                globalThis.__supabaseErrorShown = true;
                setTimeout(() => {
                  Alert.alert(
                    'Configuration Required',
                    'The app is not properly configured. Please contact support or check the app configuration.\n\n' +
                    'Technical details: ' + configurationError,
                    [{ text: 'OK' }]
                  );
                }, 100);
              }
              
              // Return appropriate response based on the method
              if (authPropStr === 'getSession' || authPropStr === 'getUser') {
                return { data: { session: null, user: null }, error: new Error(errorMessage) };
              }
              
              return { data: null, error: new Error(errorMessage), session: null, user: null };
            };
          }
        };
        return new Proxy({}, authHandler);
      }
      
      // For 'storage' and 'functions', return similar proxy objects
      if (prop === 'storage' || prop === 'functions') {
        const serviceHandler: ProxyHandler<any> = {
          get: (_target, serviceProp) => {
            return (..._args: any[]) => {
              logger.error(`❌ Supabase ${String(prop)} operation failed: ${errorMessage}`);
              return Promise.resolve({ data: null, error: new Error(errorMessage) });
            };
          }
        };
        return new Proxy({}, serviceHandler);
      }
      
      // For other properties, return a function that logs the error
      return (..._args: any[]) => {
        logger.error(`❌ Supabase operation failed: ${errorMessage}`);
        
        // Show alert on first failed operation (only once)
        if (configurationError && !globalThis.__supabaseErrorShown) {
          globalThis.__supabaseErrorShown = true;
          setTimeout(() => {
            Alert.alert(
              'Configuration Required',
              'The app is not properly configured. Please contact support or check the app configuration.\n\n' +
              'Technical details: ' + configurationError,
              [{ text: 'OK' }]
            );
          }, 100);
        }
        
        return Promise.resolve({ data: null, error: new Error(errorMessage) });
      };
    }
  };
  
  return new Proxy({} as SupabaseClient, handler);
};

// Validate and create client
const isValid = validateConfiguration();

// Export the Supabase client
export const supabase: SupabaseClient = isValid 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Not needed for mobile
      },
    })
  : createDummyClient();

// Export configuration status for components that need to check
export const isSupabaseConfigured = isValid;
export const getConfigurationError = () => configurationError;

// Type declaration for global error flag
declare global {
  var __supabaseErrorShown: boolean | undefined;
}
