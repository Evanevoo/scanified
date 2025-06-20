# Owner Portal Guide

## Overview

The Owner Portal is a separate, dedicated interface for platform owners and administrators to manage the entire SaaS platform. It provides comprehensive tools for customer management, analytics, system administration, and business operations.

## Access

### URL Structure
- **Owner Portal**: `/owner-portal`
- **Main Website**: `/home` (accessible from owner portal)

### Access Control
The owner portal is restricted to users with owner privileges. Access is controlled by:
- User role: `owner`
- Admin email addresses (configurable in `useOwnerAccess.js`)

## Features

### 1. Dashboard & Landing Page (`/owner-portal`)
- **Quick Stats**: Total customers, active/trial/cancelled subscriptions
- **System Status**: Real-time health monitoring
- **Quick Actions**: Direct access to key features
- **Platform Overview**: Recent activity and quick links

### 2. Customer Management (`/owner-portal/customers`)
- **Organization Management**: View and edit all customer organizations
- **Subscription Management**: Change plans, cancel/reactivate subscriptions
- **Billing Management**: Update payment methods, trial extensions
- **Full Data Editing**: Edit all organization fields and settings

### 3. Analytics Dashboard (`/owner-portal/analytics`)
- **Revenue Analytics**: Monthly recurring revenue, growth trends
- **Customer Analytics**: Growth, churn, retention metrics
- **Usage Analytics**: Feature usage, plan distribution
- **Business Intelligence**: Key performance indicators

### 4. Tools & Operations (`/owner-portal/tools`)
- **Bulk Operations**: Mass email, bulk plan changes
- **System Management**: Backup, maintenance, security audit
- **Customer Support**: Trial extensions, payment issue resolution
- **Administrative Tools**: System configuration, user management

### 5. Support Center (`/owner-portal/support`)
- **Ticket Management**: Customer support tickets
- **Knowledge Base**: Documentation and guides
- **Communication Tools**: Customer outreach and notifications

### 6. System Health (`/owner-portal/health`)
- **Service Monitoring**: Database, API, payment processing status
- **Performance Metrics**: Response times, error rates
- **Alert Management**: System notifications and warnings

## Navigation

### Sidebar Navigation
The owner portal includes a permanent sidebar with:
- **Quick Stats Card**: Real-time customer metrics
- **System Status Card**: Service health indicators
- **Main Navigation**: Access to all portal sections
- **Quick Actions**: Common administrative tasks

### Top Navigation Bar
- **Portal Title**: Clear identification
- **Notification Center**: Real-time alerts and notifications
- **Main Site Access**: Quick link to customer-facing website
- **User Menu**: Profile and sign-out options

## Integration with Main Website

### Access Points
1. **From Main Layout**: "Owner Portal" link in sidebar (for authorized users)
2. **Direct URL**: Navigate to `/owner-portal`
3. **From Owner Dashboard**: "Owner Portal" button in existing dashboard

### Cross-Navigation
- **Main Site Button**: Opens customer-facing website in new tab
- **Seamless Switching**: Easy navigation between portal and main site
- **Context Preservation**: Maintains user session across interfaces

## Security & Access Control

### Authentication
- Uses existing authentication system
- Requires owner role or admin email
- Session management through Supabase

### Authorization
- Role-based access control
- Owner-specific features and data
- Secure API endpoints for admin operations

### Data Protection
- Encrypted data transmission
- Secure database connections
- Audit logging for administrative actions

## Customization

### Access Control Configuration
Edit `src/hooks/useOwnerAccess.js` to customize:
- Admin email addresses
- Role requirements
- Access logic

### Feature Configuration
- Enable/disable specific portal sections
- Customize quick actions
- Modify system status checks

### Styling & Branding
- Consistent with main application theme
- Customizable color schemes
- Responsive design for all devices

## Best Practices

### Usage Guidelines
1. **Regular Monitoring**: Check system health and analytics regularly
2. **Customer Management**: Proactively manage subscriptions and support
3. **Data Backup**: Use backup tools before major changes
4. **Communication**: Use bulk email tools for important announcements

### Security Practices
1. **Access Control**: Regularly review admin access
2. **Audit Logs**: Monitor administrative actions
3. **Data Protection**: Follow data privacy guidelines
4. **Session Management**: Sign out when not in use

### Performance Optimization
1. **Caching**: Leverage browser caching for better performance
2. **Data Loading**: Use pagination for large datasets
3. **Real-time Updates**: Enable notifications for critical events
4. **Mobile Access**: Ensure responsive design for mobile devices

## Troubleshooting

### Common Issues
1. **Access Denied**: Check user role and email configuration
2. **Loading Issues**: Verify database connectivity
3. **Navigation Problems**: Clear browser cache and cookies
4. **Data Sync Issues**: Check Supabase connection status

### Support
- Check system health page for service status
- Review error logs in browser console
- Contact system administrator for persistent issues

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning insights
- **Automation Tools**: Workflow automation and triggers
- **API Management**: Developer tools and API monitoring
- **Multi-tenancy**: Enhanced tenant management features

### Integration Opportunities
- **Third-party Tools**: CRM, accounting, and marketing integrations
- **Advanced Monitoring**: External monitoring service integration
- **Reporting**: Enhanced reporting and export capabilities
- **Mobile App**: Dedicated mobile application for owners 