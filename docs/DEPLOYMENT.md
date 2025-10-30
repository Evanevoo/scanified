# Gas Cylinder Management System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Gas Cylinder Management System across different environments and platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Web Application Deployment](#web-application-deployment)
- [Mobile Application Deployment](#mobile-application-deployment)
- [Database Deployment](#database-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Supabase CLI**
- **Docker** (for containerized deployment)
- **AWS CLI** (for AWS deployment)
- **Vercel CLI** (for Vercel deployment)
- **Netlify CLI** (for Netlify deployment)

### Required Accounts

- **Supabase** account for database
- **Vercel/Netlify** account for web hosting
- **Apple Developer** account for iOS app
- **Google Play Console** account for Android app
- **AWS** account (optional, for advanced deployment)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/gas-cylinder-app.git
cd gas-cylinder-app
```

### 2. Install Dependencies

```bash
# Install web app dependencies
npm install

# Install mobile app dependencies
cd gas-cylinder-mobile
npm install
cd ..
```

### 3. Environment Variables

Create environment files for different environments:

#### Development (.env.development)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
VITE_APP_NAME=Gas Cylinder Management
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://your-project.supabase.co/rest/v1

# Email Configuration
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your-email@gmail.com
VITE_SMTP_PASS=your-app-password

# Analytics
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
VITE_MIXPANEL_TOKEN=your-mixpanel-token

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_MAINTENANCE_MODE=false
```

#### Production (.env.production)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Application Configuration
VITE_APP_NAME=Gas Cylinder Management
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://your-production-project.supabase.co/rest/v1

# Email Configuration
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your-production-email@gmail.com
VITE_SMTP_PASS=your-production-app-password

# Analytics
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
VITE_MIXPANEL_TOKEN=your-production-mixpanel-token

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_MAINTENANCE_MODE=false
```

## Web Application Deployment

### 1. Vercel Deployment

#### Setup Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SMTP_HOST
vercel env add VITE_SMTP_PORT
vercel env add VITE_SMTP_USER
vercel env add VITE_SMTP_PASS
```

#### Vercel Configuration (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@vite_supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@vite_supabase_anon_key"
  }
}
```

### 2. Netlify Deployment

#### Setup Netlify Project

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

#### Netlify Configuration (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_SUPABASE_URL = "https://your-production-project.supabase.co"
  VITE_SUPABASE_ANON_KEY = "your-production-anon-key"
```

### 3. AWS S3 + CloudFront Deployment

#### Setup AWS Infrastructure

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create S3 bucket
aws s3 mb s3://your-gas-cylinder-app

# Upload build files
aws s3 sync dist/ s3://your-gas-cylinder-app --delete

# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

#### CloudFront Configuration (cloudfront-config.json)

```json
{
  "CallerReference": "gas-cylinder-app-2024",
  "Comment": "Gas Cylinder Management System",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-gas-cylinder-app",
        "DomainName": "your-gas-cylinder-app.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-gas-cylinder-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "Enabled": true
}
```

### 4. Docker Deployment

#### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped
```

## Mobile Application Deployment

### 1. iOS App Store Deployment

#### Prerequisites

- Apple Developer account
- Xcode installed
- EAS CLI installed

#### Setup EAS

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure
```

#### EAS Configuration (eas.json)

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

#### Build and Submit

```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### 2. Android Play Store Deployment

#### Prerequisites

- Google Play Console account
- Android Studio installed
- EAS CLI installed

#### Build and Submit

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

## Database Deployment

### 1. Supabase Migration

#### Setup Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref
```

#### Run Migrations

```bash
# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

#### Migration Files

Create migration files in `supabase/migrations/`:

```sql
-- Migration: 20240101000000_create_bottles_table.sql
CREATE TABLE IF NOT EXISTS bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  serial_number TEXT,
  barcode_number TEXT,
  product_code TEXT,
  description TEXT,
  size TEXT,
  type TEXT,
  gas_type TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  location TEXT,
  customer_name TEXT,
  assigned_customer UUID REFERENCES customers(id),
  rental_start_date TIMESTAMP WITH TIME ZONE,
  rental_end_date TIMESTAMP WITH TIME ZONE,
  last_inspection_date TIMESTAMP WITH TIME ZONE,
  next_inspection_date TIMESTAMP WITH TIME ZONE,
  purchase_date TIMESTAMP WITH TIME ZONE,
  purchase_price DECIMAL(10,2),
  current_value DECIMAL(10,2),
  condition TEXT,
  notes TEXT,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view bottles in their organization" ON bottles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bottles in their organization" ON bottles
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bottles in their organization" ON bottles
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bottles in their organization" ON bottles
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );
```

## CI/CD Pipeline

### 1. GitHub Actions

#### Workflow File (.github/workflows/deploy.yml)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run linting
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
```

### 2. Environment Variables Setup

#### GitHub Secrets

Add the following secrets to your GitHub repository:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SMTP_HOST`
- `VITE_SMTP_PORT`
- `VITE_SMTP_USER`
- `VITE_SMTP_PASS`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Monitoring and Logging

### 1. Application Monitoring

#### Sentry Integration

```bash
# Install Sentry
npm install @sentry/react @sentry/tracing

# Configure Sentry
```

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [
    new BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

#### Analytics Integration

```javascript
// src/utils/analytics.js
import { track } from 'mixpanel-browser';

export const trackEvent = (eventName, properties = {}) => {
  if (process.env.NODE_ENV === 'production') {
    track(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      user_id: getCurrentUserId(),
      organization_id: getCurrentOrganizationId()
    });
  }
};
```

### 2. Database Monitoring

#### Supabase Monitoring

- Enable database monitoring in Supabase dashboard
- Set up alerts for high CPU usage
- Monitor query performance
- Track database size and growth

#### Custom Monitoring

```sql
-- Create monitoring view
CREATE VIEW database_stats AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem**: Build fails with dependency errors
**Solution**: 
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Environment Variables Not Loading

**Problem**: Environment variables not available in production
**Solution**: 
- Check variable names (must start with `VITE_`)
- Verify deployment platform configuration
- Test with `console.log(import.meta.env)`

#### 3. Database Connection Issues

**Problem**: Cannot connect to Supabase
**Solution**:
- Verify Supabase URL and keys
- Check network connectivity
- Review RLS policies

#### 4. Mobile App Build Failures

**Problem**: EAS build fails
**Solution**:
```bash
# Clear EAS cache
eas build --clear-cache

# Check EAS configuration
eas build:configure
```

### Performance Optimization

#### 1. Bundle Size Optimization

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
};
```

#### 2. Database Query Optimization

```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_bottles_organization_status ON bottles(organization_id, status);
CREATE INDEX idx_customers_organization_name ON customers(organization_id, name);
CREATE INDEX idx_rentals_customer_status ON rentals(customer_id, status);
```

### Security Considerations

#### 1. Environment Variables Security

- Never commit `.env` files to version control
- Use secure secret management
- Rotate keys regularly
- Use different keys for different environments

#### 2. Database Security

- Enable RLS on all tables
- Use least privilege principle
- Regular security audits
- Monitor for suspicious activity

## Support

For deployment issues:
- Email: deployment@gascylinderapp.com
- Documentation: https://docs.gascylinderapp.com/deployment
- GitHub Issues: https://github.com/gascylinderapp/issues
- Status Page: https://status.gascylinderapp.com
