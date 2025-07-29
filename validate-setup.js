#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

console.log('🔍 Gas Cylinder App - Setup Validator\n');

let errors = [];
let warnings = [];
let successes = [];

// Check for .env file
if (!fs.existsSync('.env')) {
  errors.push('❌ .env file not found. Copy .env.example to .env and configure it.');
} else {
  successes.push('✅ .env file found');
}

// Check required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const optionalEnvVars = [
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS'
];

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    errors.push(`❌ Missing required environment variable: ${varName}`);
  } else if (process.env[varName].includes('your-') || process.env[varName].includes('your_')) {
    warnings.push(`⚠️  ${varName} appears to be a placeholder value`);
  } else {
    successes.push(`✅ ${varName} is configured`);
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    warnings.push(`⚠️  Optional variable ${varName} is not configured`);
  } else if (process.env[varName].includes('your-') || process.env[varName].includes('your_')) {
    warnings.push(`⚠️  ${varName} appears to be a placeholder value`);
  } else {
    successes.push(`✅ ${varName} is configured`);
  }
});

// Test Supabase connection
async function testSupabaseConnection() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    errors.push('❌ Cannot test Supabase connection - missing credentials');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection by checking if auth works
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      errors.push(`❌ Supabase connection failed: ${error.message}`);
    } else {
      successes.push('✅ Supabase connection successful');
      
      // Try to check if tables exist
      const tables = ['organizations', 'profiles', 'customers', 'bottles'];
      for (const table of tables) {
        const { error: tableError } = await supabase.from(table).select('id').limit(1);
        if (tableError && tableError.code === '42P01') {
          errors.push(`❌ Table '${table}' does not exist - run migrations`);
        } else if (!tableError) {
          successes.push(`✅ Table '${table}' exists`);
        }
      }
    }
  } catch (err) {
    errors.push(`❌ Supabase connection error: ${err.message}`);
  }
}

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 16) {
  errors.push(`❌ Node.js version ${nodeVersion} is too old. Required: 16.0.0 or higher`);
} else {
  successes.push(`✅ Node.js version ${nodeVersion} is supported`);
}

// Check if dependencies are installed
if (!fs.existsSync('node_modules')) {
  errors.push('❌ Dependencies not installed. Run: npm install');
} else {
  successes.push('✅ Dependencies installed');
}

// Run async tests
await testSupabaseConnection();

// Display results
console.log('\n📊 Validation Results:\n');

if (successes.length > 0) {
  console.log('✅ Successes:');
  successes.forEach(s => console.log(`   ${s}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(e => console.log(`   ${e}`));
}

// Summary
console.log('\n📋 Summary:');
console.log(`   ✅ ${successes.length} checks passed`);
console.log(`   ⚠️  ${warnings.length} warnings`);
console.log(`   ❌ ${errors.length} errors`);

if (errors.length === 0) {
  console.log('\n🎉 Your setup looks good! You can start the app with: npm run dev');
} else {
  console.log('\n⚡ Please fix the errors above before running the app.');
  process.exit(1);
} 