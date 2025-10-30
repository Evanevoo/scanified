# Scanified - Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Code & Configuration
- [ ] All features tested and working
- [ ] No console.log statements in production code
- [ ] Environment variables configured for production
- [ ] Database migrations completed
- [ ] RLS policies enabled and tested
- [ ] API rate limiting configured
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations

### ✅ Security
- [ ] SSL/TLS certificates configured
- [ ] CORS properly configured
- [ ] Authentication working correctly
- [ ] Authorization (RLS) policies enforced
- [ ] Sensitive data encrypted
- [ ] API keys secured (not in client code)
- [ ] Input validation on all forms
- [ ] XSS prevention measures active

### ✅ Performance
- [ ] Database queries optimized
- [ ] Indexes added for common queries
- [ ] Images optimized and compressed
- [ ] Code splitting implemented
- [ ] Bundle size optimized
- [ ] Caching strategies in place
- [ ] CDN configured for static assets

### ✅ Monitoring
- [ ] Error tracking service set up (Sentry)
- [ ] Analytics configured (Google Analytics)
- [ ] Uptime monitoring configured
- [ ] Performance monitoring active
- [ ] Log aggregation set up
- [ ] Alerting configured for critical issues

### ✅ Backup & Recovery
- [ ] Database backup strategy defined
- [ ] Automated backups configured
- [ ] Recovery procedures documented
- [ ] Data retention policy defined
- [ ] Disaster recovery plan in place

---

## Environment Configuration

### Required Environment Variables

#### Web Application (.env)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Application Settings
VITE_APP_NAME=Scanified
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# Optional: Analytics
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X

# Optional: Error Tracking
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Optional: Feature Flags
VITE_ENABLE_BETA_FEATURES=false
```

#### Mobile Applications (app.json / eas.json)
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your_anon_key_here",
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## Database Setup

### 1. Supabase Project Configuration

```sql
-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ... enable for all tables

-- Create indexes for performance
CREATE INDEX idx_bottles_org_barcode ON bottles(organization_id, barcode_number);
CREATE INDEX idx_bottles_status ON bottles(status, organization_id);
CREATE INDEX idx_deliveries_customer ON deliveries(customer_id, organization_id);
CREATE INDEX idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX idx_profiles_org ON profiles(organization_id);

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE bottles;
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 2. Database Functions & Triggers

```sql
-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_bottles_updated_at 
  BEFORE UPDATE ON bottles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other tables...
```

### 3. Backup Configuration

In Supabase Dashboard:
1. Go to Database → Backups
2. Enable automatic daily backups
3. Configure retention period (7-30 days)
4. Test restore procedure

---

## Web Application Deployment (Netlify)

### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Connect to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. Select `scanified` repository

### Step 3: Build Configuration

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Step 4: Environment Variables

In Netlify Dashboard → Site settings → Environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_ENV=production
```

### Step 5: Custom Domain (Optional)

1. Go to Domain settings
2. Add custom domain (e.g., app.scanified.com)
3. Configure DNS:
   - Add CNAME record pointing to your Netlify site
   - Or use Netlify DNS
4. Enable HTTPS (automatic with Let's Encrypt)

### Step 6: Deploy

```bash
# Trigger deployment
git push origin main

# Or deploy manually
npm run build
netlify deploy --prod
```

### Step 7: Post-Deployment Verification

- [ ] Visit production URL
- [ ] Test login/authentication
- [ ] Verify data loads correctly
- [ ] Test create/update/delete operations
- [ ] Check mobile responsiveness
- [ ] Test in multiple browsers
- [ ] Verify SSL certificate

---

## Mobile Application Deployment

### Android Deployment (Google Play Store)

#### Step 1: Configure for Production

```json
// app.json
{
  "expo": {
    "name": "Scanified",
    "slug": "scanified",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.scanified",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "CAMERA",
        "NOTIFICATIONS"
      ]
    }
  }
}
```

#### Step 2: Build with EAS

```bash
cd gas-cylinder-android

# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for production
eas build --platform android --profile production
```

#### Step 3: Test the Build

```bash
# Download the APK/AAB and test on device
# Or use EAS Submit for internal testing
eas submit --platform android --profile preview
```

#### Step 4: Submit to Play Store

1. Create Play Store developer account ($25 one-time fee)
2. Create app listing
3. Upload screenshots, description, etc.
4. Submit for review:

```bash
eas submit --platform android --profile production
```

5. Wait for approval (usually 1-3 days)

### iOS Deployment (App Store)

#### Step 1: Configure for Production

```json
// app.json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.scanified",
      "buildNumber": "1.0.0",
      "supportsTablet": true
    }
  }
}
```

#### Step 2: Apple Developer Requirements

- Apple Developer account ($99/year)
- App Store Connect access
- Certificates and provisioning profiles (EAS handles this)

#### Step 3: Build with EAS

```bash
cd gas-cylinder-mobile

# Build for production
eas build --platform ios --profile production
```

#### Step 4: Submit to App Store

```bash
eas submit --platform ios --profile production
```

Fill in App Store Connect information:
- App name
- Description
- Keywords
- Screenshots (various device sizes)
- App icon
- Privacy policy URL
- Support URL

#### Step 5: App Review

- Apple reviews typically take 24-48 hours
- May require additional information
- Address any feedback promptly

---

## Post-Deployment Configuration

### 1. Set Up Monitoring

#### Sentry (Error Tracking)
```bash
npm install @sentry/react @sentry/tracing

# Initialize in main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your_sentry_dsn",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

#### Google Analytics
```javascript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

### 2. Set Up Uptime Monitoring

Use services like:
- UptimeRobot (free tier available)
- Pingdom
- StatusCake
- New Relic

Configure alerts for:
- Site downtime
- Slow response times (>5s)
- SSL certificate expiration
- High error rates

### 3. Configure Backup Verification

```bash
# Create script to verify backups
#!/bin/bash
# backup-verify.sh

echo "Verifying latest backup..."
# Add commands to check backup integrity
# Test restore to staging environment
```

Schedule daily/weekly backup verification.

### 4. Set Up CI/CD Pipeline (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

---

## Scaling Considerations

### Database Scaling

1. **Vertical Scaling** (Increase resources)
   - Upgrade Supabase plan
   - More CPU/RAM/Storage

2. **Horizontal Scaling** (Add read replicas)
   - Enable read replicas in Supabase
   - Route read queries to replicas

3. **Optimize Queries**
   - Add indexes for slow queries
   - Use materialized views for complex queries
   - Implement caching layer (Redis)

### Application Scaling

1. **CDN for Static Assets**
   - Use Cloudflare or AWS CloudFront
   - Cache images, CSS, JavaScript

2. **Load Balancing**
   - Netlify handles this automatically
   - Or use AWS ELB, Cloudflare Load Balancing

3. **Serverless Functions**
   - Move heavy operations to serverless functions
   - Scale automatically with demand

### Mobile App Scaling

1. **API Rate Limiting**
   - Implement rate limits in Supabase
   - Use exponential backoff for retries

2. **Image Optimization**
   - Compress images before upload
   - Use appropriate image sizes
   - Implement progressive loading

3. **Caching Strategy**
   - Cache static data locally
   - Implement stale-while-revalidate
   - Lazy load non-critical data

---

## Maintenance & Updates

### Regular Maintenance Schedule

**Weekly:**
- Check error logs
- Review uptime reports
- Monitor database performance
- Review user feedback

**Monthly:**
- Update dependencies
- Review security advisories
- Analyze usage metrics
- Optimize slow queries
- Review and update documentation

**Quarterly:**
- Major feature releases
- Performance audit
- Security audit
- Backup restore test
- Disaster recovery drill

### Update Procedures

#### Web Application Updates

```bash
# 1. Create a new branch
git checkout -b feature/update-xyz

# 2. Make changes and test thoroughly

# 3. Merge to staging branch first
git checkout staging
git merge feature/update-xyz
# Deploy to staging environment
# Test thoroughly

# 4. Merge to main for production
git checkout main
git merge staging
git push origin main
# Netlify auto-deploys
```

#### Mobile App Updates

```bash
# 1. Update version numbers
# In app.json: version and versionCode/buildNumber

# 2. Build new version
eas build --platform all --profile production

# 3. Submit for review
eas submit --platform all --profile production

# 4. Gradual rollout (recommended)
# Start with 10% of users
# Gradually increase to 100% over several days
```

---

## Rollback Procedures

### Web Application Rollback

```bash
# Option 1: Netlify Dashboard
# Go to Deploys → Find previous working deploy → Click "Publish deploy"

# Option 2: Git revert
git revert <commit-hash>
git push origin main

# Option 3: Redeploy previous version
git checkout <previous-commit>
netlify deploy --prod
```

### Mobile App Rollback

- Cannot rollback immediately (App Store/Play Store restrictions)
- Submit expedited update with fix
- Use feature flags to disable problematic features
- Communicate with users via in-app messages

### Database Rollback

```bash
# 1. Stop application traffic (maintenance mode)
# 2. Restore from backup
# Via Supabase Dashboard or:
psql -U postgres -d your_database < backup_file.sql

# 3. Verify data integrity
# 4. Resume application traffic
```

---

## Security Hardening

### Web Application Security

1. **Content Security Policy**
   - Configured in netlify.toml (see above)

2. **Rate Limiting**
   ```javascript
   // Implement in Supabase Edge Functions
   const rateLimit = new RateLimiter({
     max: 100, // requests
     window: 60000 // per minute
   });
   ```

3. **Input Sanitization**
   - Use DOMPurify for user-generated HTML
   - Validate all inputs server-side

4. **Dependency Scanning**
   ```bash
   npm audit
   npm audit fix
   ```

### Database Security

1. **Regular Backups**
   - Automated daily backups
   - Test restore procedures monthly

2. **Access Control**
   - Principle of least privilege
   - Rotate API keys regularly
   - Use service roles appropriately

3. **Monitoring**
   - Enable query logging
   - Monitor for suspicious activity
   - Alert on failed authentication attempts

---

## Troubleshooting Production Issues

### Common Issues & Solutions

**Issue**: Site is down
1. Check Netlify status page
2. Check Supabase status
3. Review recent deployments
4. Check error logs in Sentry
5. Rollback if necessary

**Issue**: Slow performance
1. Check database query performance
2. Review browser network tab
3. Check for missing indexes
4. Review recent code changes
5. Scale resources if needed

**Issue**: Authentication errors
1. Verify environment variables
2. Check Supabase Auth settings
3. Review RLS policies
4. Check JWT expiration settings

**Issue**: Data sync issues (mobile)
1. Check network connectivity
2. Review sync logs
3. Verify API endpoints
4. Check RLS policies
5. Clear app cache if needed

---

## Support & Escalation

### Support Tiers

**Tier 1**: User-facing issues
- Help documentation
- In-app support chat
- Email support

**Tier 2**: Technical issues
- Developer documentation
- API issues
- Integration problems

**Tier 3**: Critical system issues
- Downtime
- Data loss
- Security incidents

### Escalation Process

1. **Identify severity**
   - Critical: System down, data loss
   - High: Major feature broken
   - Medium: Minor feature broken
   - Low: Cosmetic issue

2. **Initial response**
   - Critical: Immediate (< 1 hour)
   - High: 4 hours
   - Medium: 24 hours
   - Low: 48 hours

3. **Communication**
   - Update status page
   - Notify affected users
   - Provide ETAs
   - Post-mortem after resolution

---

## Compliance & Legal

### Data Protection

- GDPR compliance (if serving EU users)
- CCPA compliance (if serving California users)
- Data retention policies
- Right to deletion (user data export/deletion)

### Terms of Service & Privacy Policy

- Review and update regularly
- Make easily accessible
- Require acceptance on signup
- Log consent

### Accessibility

- WCAG 2.1 AA compliance
- Regular accessibility audits
- Keyboard navigation support
- Screen reader compatibility

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Technical Metrics:**
- Uptime: >99.9%
- Page load time: <3s
- API response time: <500ms
- Error rate: <0.1%
- Mobile crash rate: <0.5%

**Business Metrics:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- User retention rate
- Feature adoption rate
- Customer satisfaction (NPS)

### Monitoring Dashboard

Create a central dashboard showing:
- System uptime
- Current users online
- API request volume
- Error rates
- Database performance
- Recent deployments

---

## Conclusion

This deployment guide provides a comprehensive checklist and procedures for deploying Scanified to production. Follow each step carefully, verify thoroughly, and maintain regular updates and monitoring.

**Remember**: Always test in staging before deploying to production!

---

**Document Version**: 1.0  
**Last Updated**: October 30, 2025  
**Next Review**: January 30, 2026

For questions or issues, contact: dev@scanified.com
