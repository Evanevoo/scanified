# Role-Based Access Control Guide

## Overview

The LessAnnoyingScan application implements a comprehensive role-based access control (RBAC) system that separates features and functionality based on user roles and permissions. This ensures that users only see and can access features appropriate to their role within the organization.

## User Roles Hierarchy

### 1. **Owner** (Platform Administrator)
- **Access Level**: Complete platform access
- **Permissions**: All permissions (`*`)
- **Navigation**: Simplified owner portal interface
- **Features**: Platform management, customer organization oversight

### 2. **Admin** (Organization Administrator)
- **Access Level**: Full organizational access
- **Permissions**: All organizational permissions
- **Navigation**: Full administrative interface with all sections
- **Features**: User management, billing, settings, analytics, organization tools

### 3. **Manager** (Team Manager)
- **Access Level**: Operational management access
- **Permissions**: Read/write access to core operations, limited admin features
- **Navigation**: Operations + advanced features sections
- **Features**: Team management, advanced operations, reporting

### 4. **User** (Team Member)
- **Access Level**: Daily operations access
- **Permissions**: Read access to most data, limited write access
- **Navigation**: Core operations + customer services sections
- **Features**: Daily operations, customer interaction, basic reporting

## Navigation Structure

### Owner Navigation
```
├── Dashboard
└── Owner Portal
    ├── Customer Management
    ├── Analytics
    ├── Support Tickets
    └── System Administration
```

### Admin Navigation
```
├── Daily Operations (Collapsed/Expanded)
│   ├── Dashboard
│   ├── Customers
│   ├── Inventory
│   ├── Deliveries
│   ├── Rentals
│   └── Invoices
├── Advanced Features (Collapsed/Expanded)
│   ├── Truck Reconciliation
│   ├── Route Optimization
│   ├── Workflow Automation
│   ├── Smart Inventory
│   └── Bottle Management
├── Administration (Expanded)
│   ├── User Management
│   ├── Analytics
│   ├── Organization Tools
│   ├── Billing
│   ├── Settings
│   └── Reports
├── Customer Services
│   ├── Customer Portal
│   ├── Customer Self Service
│   └── Theme Showcase
└── Support Center
```

### Manager Navigation
```
├── Daily Operations (Expanded)
│   ├── Dashboard
│   ├── Customers
│   ├── Inventory
│   ├── Deliveries
│   ├── Rentals
│   └── Invoices
├── Advanced Features (Collapsed)
│   ├── Truck Reconciliation
│   ├── Route Optimization
│   ├── Workflow Automation
│   ├── Smart Inventory
│   └── Bottle Management
├── Administration (Limited)
│   ├── Analytics
│   └── Reports
├── Customer Services
│   ├── Customer Portal
│   ├── Customer Self Service
│   └── Theme Showcase
└── Support Center
```

### User Navigation
```
├── Daily Operations (Expanded)
│   ├── Dashboard
│   ├── Customers
│   ├── Inventory
│   ├── Deliveries
│   ├── Rentals
│   └── Invoices
├── Customer Services
│   ├── Customer Portal
│   ├── Customer Self Service
│   └── Theme Showcase
└── Support Center
```

## Feature Access Matrix

| Feature | Owner | Admin | Manager | User |
|---------|-------|-------|---------|------|
| **Core Operations** |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ | ✅ (Read) |
| Inventory | ✅ | ✅ | ✅ | ✅ (Read) |
| Deliveries | ✅ | ✅ | ✅ | ✅ (Read) |
| Rentals | ✅ | ✅ | ✅ | ✅ (Read) |
| Invoices | ✅ | ✅ | ✅ | ✅ (Read) |
| **Advanced Operations** |
| Truck Reconciliation | ✅ | ✅ | ✅ | ❌ |
| Route Optimization | ✅ | ✅ | ✅ | ❌ |
| Workflow Automation | ✅ | ✅ | ✅ | ❌ |
| Smart Inventory | ✅ | ✅ | ✅ | ❌ |
| Bottle Management | ✅ | ✅ | ✅ | ❌ |
| **Administrative** |
| User Management | ✅ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ (Limited) | ❌ |
| Organization Tools | ✅ | ✅ | ❌ | ❌ |
| Billing | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ |
| **Customer Services** |
| Customer Portal | ✅ | ✅ | ✅ | ✅ |
| Customer Self Service | ✅ | ✅ | ✅ | ✅ |
| Theme Showcase | ✅ | ✅ | ✅ | ✅ |
| Support Center | ✅ | ✅ | ✅ | ✅ |

## Dashboard Customization

### Admin Dashboard
- **Statistics**: All metrics including user counts, overdue invoices
- **Quick Actions**: Administrative actions (User Management, Settings, Billing)
- **Alerts**: Administrative alerts (overdue invoices, system issues)
- **Recent Activity**: Full audit trail access

### Manager Dashboard
- **Statistics**: Operational metrics (customers, inventory, deliveries)
- **Quick Actions**: Operational actions (Deliveries, Reports, Advanced Features)
- **Alerts**: Operational alerts (delivery issues, inventory alerts)
- **Recent Activity**: Team activity within their scope

### User Dashboard
- **Statistics**: Basic metrics (customers, inventory, rentals)
- **Quick Actions**: Daily operations (View data, Customer Portal)
- **Alerts**: Personal alerts and notifications
- **Recent Activity**: Personal activity and updates

## Permission System

### Permission Categories
```javascript
// Administrative Permissions
'manage:users'         // User management
'manage:billing'       // Billing and subscriptions
'manage:roles'         // Role management
'manage:organization'  // Organization settings
'manage:settings'      // System settings

// Data Permissions
'read:customers'       // View customer data
'write:customers'      // Edit customer data
'delete:customers'     // Delete customer data
'read:cylinders'       // View cylinder data
'write:cylinders'      // Edit cylinder data
'delete:cylinders'     // Delete cylinder data

// Operational Permissions
'read:invoices'        // View invoices
'write:invoices'       // Create/edit invoices
'read:rentals'         // View rental data
'write:rentals'        // Manage rentals
'read:analytics'       // View analytics
'read:reports'         // Generate reports
```

### Role-Permission Mapping
```javascript
// Admin Role
const adminPermissions = [
  'manage:users', 'manage:billing', 'manage:roles', 
  'manage:organization', 'manage:settings',
  'read:customers', 'write:customers', 'delete:customers',
  'read:cylinders', 'write:cylinders', 'delete:cylinders',
  'read:invoices', 'write:invoices', 'delete:invoices',
  'read:rentals', 'write:rentals', 'read:analytics', 'read:reports'
];

// Manager Role
const managerPermissions = [
  'read:customers', 'write:customers',
  'read:cylinders', 'write:cylinders',
  'read:invoices', 'write:invoices',
  'read:rentals', 'write:rentals',
  'read:analytics', 'read:reports'
];

// User Role
const userPermissions = [
  'read:customers', 'read:cylinders', 
  'read:invoices', 'read:rentals'
];
```

## Implementation Components

### 1. FeatureAccess Component
```jsx
import { AdminOnly, ManagerOnly, RequirePermission } from '../components/FeatureAccess';

// Admin-only feature
<AdminOnly>
  <UserManagement />
</AdminOnly>

// Manager-only feature
<ManagerOnly>
  <AdvancedReports />
</ManagerOnly>

// Permission-based feature
<RequirePermission permission="manage:billing">
  <BillingSettings />
</RequirePermission>
```

### 2. Sidebar Navigation
- **Collapsible Sections**: Group related features
- **Role-based Filtering**: Show only relevant features
- **Visual Indicators**: Role badges and descriptions
- **Progressive Disclosure**: Advanced features hidden by default

### 3. Dashboard Customization
- **Role-specific Quick Actions**: Different actions for each role
- **Contextual Statistics**: Show relevant metrics
- **Personalized Welcome**: Role-appropriate messaging
- **Smart Alerts**: Role-relevant notifications

## Security Considerations

### Frontend Security
- **Component-level Access Control**: Features hidden at component level
- **Route Protection**: Unauthorized routes redirect to access denied
- **UI State Management**: Role-based UI state and visibility

### Backend Security
- **API Endpoint Protection**: Server-side permission validation
- **Row Level Security (RLS)**: Database-level access control
- **Audit Logging**: All actions logged with user context

### Data Isolation
- **Organization Scoping**: All data scoped to user's organization
- **Permission Validation**: Every action validated against user permissions
- **Secure Defaults**: Deny access by default, grant explicitly

## Best Practices

### For Developers
1. **Always use FeatureAccess components** for feature gating
2. **Implement both frontend and backend validation**
3. **Use semantic permission names** (action:resource format)
4. **Test with different user roles** during development
5. **Document new permissions** in this guide

### For Administrators
1. **Regularly review user roles** and permissions
2. **Use principle of least privilege** when assigning roles
3. **Monitor audit logs** for unauthorized access attempts
4. **Train users** on their role capabilities
5. **Update permissions** as business needs change

### For Users
1. **Understand your role limitations** and capabilities
2. **Request appropriate access** through proper channels
3. **Report access issues** to administrators
4. **Use features appropriately** for your role
5. **Contact support** for permission questions

## Migration and Upgrades

### Adding New Roles
1. Define role in database `roles` table
2. Add permission mappings in `usePermissions.js`
3. Update navigation in `Sidebar.jsx`
4. Add role-specific dashboard content
5. Update this documentation

### Adding New Permissions
1. Define permission in permission system
2. Add to appropriate role mappings
3. Implement permission checks in components
4. Add backend validation
5. Update documentation

### Upgrading Existing Users
1. Create migration script for role assignments
2. Test permission mappings thoroughly
3. Communicate changes to users
4. Provide training on new features
5. Monitor for access issues

## Troubleshooting

### Common Issues
1. **User can't access feature**: Check role and permission mappings
2. **Navigation not showing**: Verify role-based filtering logic
3. **Dashboard shows wrong content**: Check role detection logic
4. **Permission denied errors**: Validate backend permission checks

### Debug Tools
1. **Browser Console**: Check permission and role state
2. **Network Tab**: Verify API permission responses
3. **Database Queries**: Check RLS policy effectiveness
4. **Audit Logs**: Review user action history

## Future Enhancements

### Planned Features
1. **Custom Role Creation**: Allow admins to create custom roles
2. **Granular Permissions**: More specific permission controls
3. **Time-based Access**: Temporary role assignments
4. **Multi-organization Access**: Users with access to multiple orgs
5. **Advanced Audit**: Enhanced audit trail and reporting

### Considerations
1. **Performance**: Minimize permission checks impact
2. **Scalability**: Handle large numbers of users and roles
3. **Flexibility**: Easy to add new roles and permissions
4. **Usability**: Clear and intuitive access control
5. **Security**: Robust protection against unauthorized access

---

This role-based access control system provides a secure, scalable, and user-friendly way to manage feature access across different user types while maintaining clear separation of concerns and responsibilities. 