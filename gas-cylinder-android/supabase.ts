import logger from './utils/logger';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('❌ Supabase configuration missing!');
  logger.error('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  logger.error('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
