# Gas Cylinder Management System - Architecture Documentation

## Overview

The Gas Cylinder Management System is a comprehensive web and mobile application designed to manage gas cylinder inventory, customer relationships, rental operations, and maintenance workflows. The system follows modern architectural patterns and best practices for scalability, maintainability, and performance.

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Database Design](#database-design)
- [API Architecture](#api-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Mobile Architecture](#mobile-architecture)
- [Security Architecture](#security-architecture)
- [Performance Architecture](#performance-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Data Flow](#data-flow)
- [Integration Patterns](#integration-patterns)

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client   │    │  Admin Portal  │
│   (React/Vite)  │    │ (React Native)   │    │   (React)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (Supabase)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │  (PostgreSQL)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   File Storage   │
                    │   (Supabase)    │
                    └─────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Web App       │   Mobile App    │     Admin Portal        │
│   (React)       │ (React Native)  │      (React)            │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Business      │   State         │     Routing             │
│   Logic         │   Management    │     Management          │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│   API Client    │   Auth Service  │     Data Service        │
│   (Supabase)    │   (Supabase)    │     (Supabase)          │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Database      │   File Storage  │     Cache Layer         │
│  (PostgreSQL)   │   (Supabase)    │     (Local Storage)     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Technology Stack

### Frontend Technologies

#### Web Application
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.3.6
- **UI Components**: Material-UI (MUI) 5.14.20
- **State Management**: Zustand 4.4.7
- **Routing**: React Router DOM 6.20.1
- **HTTP Client**: Supabase Client 2.38.4
- **Testing**: Jest 29.7.0, Testing Library 14.1.2
- **TypeScript**: 5.2.2 (for type definitions)

#### Mobile Application
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State Management**: Context API + Hooks
- **HTTP Client**: Supabase Client
- **Offline Support**: AsyncStorage + SQLite
- **Push Notifications**: Expo Notifications
- **Testing**: Jest + React Native Testing Library

### Backend Technologies

#### Database & API
- **Database**: PostgreSQL 15+
- **API**: Supabase (PostgREST)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **File Storage**: Supabase Storage
- **Edge Functions**: Supabase Edge Functions

#### Infrastructure
- **Hosting**: Vercel/Netlify (Web), EAS (Mobile)
- **CDN**: CloudFront/Vercel Edge Network
- **Monitoring**: Sentry, Mixpanel
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Organizations  │    │    Profiles     │    │     Users       │
│                 │    │                 │    │                 │
│ id (PK)         │◄───┤ id (PK)         │◄───┤ id (PK)         │
│ name            │    │ user_id (FK)     │    │ email           │
│ slug            │    │ organization_id  │    │ created_at      │
│ description     │    │ full_name       │    │ updated_at      │
│ subscription_   │    │ role            │    │                 │
│ status          │    │ is_active       │    │                 │
│ max_users       │    │ created_at      │    │                 │
│ max_cylinders   │    │ updated_at      │    │                 │
│ max_customers   │    │                 │    │                 │
│ created_at      │    │                 │    │                 │
│ updated_at      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│    Bottles      │    │   Customers     │
│                 │    │                 │
│ id (PK)         │    │ id (PK)         │
│ organization_id │    │ organization_id │
│ serial_number   │    │ CustomerListID  │
│ barcode_number  │    │ name            │
│ product_code    │    │ email           │
│ description     │    │ phone           │
│ size            │    │ address         │
│ type            │    │ customer_type   │
│ gas_type        │    │ status          │
│ status          │    │ credit_limit    │
│ location        │    │ payment_terms   │
│ customer_name   │    │ created_at      │
│ rental_start_   │    │ updated_at      │
│ date            │    │                 │
│ rental_end_date │    │                 │
│ last_inspection │    │                 │
│ date            │    │                 │
│ next_inspection │    │                 │
│ date            │    │                 │
│ purchase_date   │    │                 │
│ purchase_price  │    │                 │
│ current_value   │    │                 │
│ condition       │    │                 │
│ notes           │    │                 │
│ images          │    │                 │
│ created_at      │    │                 │
│ updated_at      │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│    Rentals      │    │   Deliveries    │
│                 │    │                 │
│ id (PK)         │    │ id (PK)         │
│ organization_id │    │ organization_id │
│ customer_id     │    │ customer_id     │
│ bottle_id       │    │ delivery_date   │
│ rental_start_   │    │ delivery_       │
│ date            │    │ address         │
│ rental_end_date │    │ contact_person  │
│ daily_rate      │    │ contact_phone   │
│ total_amount    │    │ status          │
│ status          │    │ driver_id       │
│ payment_status  │    │ vehicle_id      │
│ payment_due_    │    │ route_id        │
│ date            │    │ delivery_notes  │
│ late_fees       │    │ signature       │
│ notes           │    │ photos          │
│ created_at      │    │ delivery_time   │
│ updated_at      │    │ created_at      │
└─────────────────┘    └─────────────────┘
```

### Database Schema Principles

#### 1. Multi-Tenancy
- All tables include `organization_id` for data isolation
- Row Level Security (RLS) policies enforce tenant boundaries
- Shared resources are properly isolated

#### 2. Audit Trail
- All tables include `created_at` and `updated_at` timestamps
- Soft deletes using `deleted_at` column
- Audit logs for sensitive operations

#### 3. Data Integrity
- Foreign key constraints maintain referential integrity
- Check constraints validate data ranges
- Unique constraints prevent duplicates

#### 4. Performance Optimization
- Strategic indexes on frequently queried columns
- Partitioning for large tables
- Materialized views for complex queries

## API Architecture

### RESTful API Design

#### Base URL Structure
```
https://your-project.supabase.co/rest/v1/
```

#### Resource Endpoints
```
GET    /organizations           # List organizations
POST   /organizations           # Create organization
GET    /organizations/{id}      # Get organization
PUT    /organizations/{id}      # Update organization
DELETE /organizations/{id}      # Delete organization

GET    /bottles                 # List bottles
POST   /bottles                 # Create bottle
GET    /bottles/{id}            # Get bottle
PUT    /bottles/{id}            # Update bottle
DELETE /bottles/{id}            # Delete bottle

GET    /customers               # List customers
POST   /customers               # Create customer
GET    /customers/{id}          # Get customer
PUT    /customers/{id}          # Update customer
DELETE /customers/{id}          # Delete customer
```

#### Query Parameters
```
# Filtering
?status=eq.active
?organization_id=eq.uuid
?created_at=gte.2024-01-01

# Sorting
?order=name.asc
?order=created_at.desc

# Pagination
?limit=20&offset=0

# Field Selection
?select=id,name,status
?select=id,name,customer(name,email)

# Search
?name=ilike.*gas*
?description=ilike.*cylinder*
```

### Real-time Subscriptions

#### WebSocket Connections
```javascript
// Subscribe to bottle updates
const subscription = supabase
  .channel('bottles')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'bottles',
    filter: `organization_id=eq.${organizationId}`
  }, (payload) => {
    console.log('Bottle updated:', payload.new);
  })
  .subscribe();
```

#### Event Types
- `INSERT` - New record created
- `UPDATE` - Record updated
- `DELETE` - Record deleted
- `*` - All events

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "aud": "authenticated",
  "exp": 1640995200,
  "iat": 1640908800,
  "iss": "supabase",
  "sub": "user-uuid",
  "email": "user@example.com",
  "phone": "+1234567890",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "full_name": "John Doe"
  },
  "role": "authenticated"
}
```

#### Row Level Security (RLS)
```sql
-- Example RLS policy
CREATE POLICY "Users can view bottles in their organization" ON bottles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );
```

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider
│   ├── Router
│   │   ├── ProtectedRoute
│   │   │   ├── MainLayout
│   │   │   │   ├── Sidebar
│   │   │   │   ├── Header
│   │   │   │   └── MainContent
│   │   │   │       ├── Page Components
│   │   │   │       │   ├── BottleManagement
│   │   │   │       │   ├── CustomerManagement
│   │   │   │       │   ├── RentalManagement
│   │   │   │       │   └── DeliveryManagement
│   │   │   │       └── Utility Components
│   │   │   │           ├── ResponsiveTable
│   │   │   │           ├── AccessibleForm
│   │   │   │           └── AccessibleButton
│   │   │   └── OwnerPortal
│   │   │       ├── Analytics
│   │   │       ├── UserManagement
│   │   │       └── SystemHealth
│   │   └── PublicRoutes
│   │       ├── LandingPage
│   │       ├── LoginPage
│   │       └── CreateOrganization
│   └── ErrorBoundary
└── NotificationProvider
```

### State Management

#### Global State (Zustand)
```javascript
// src/store/appStore.js
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // State
  notifications: [],
  loading: false,
  error: null,
  
  // Actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification]
    })),
  
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
```

#### Local State (React Hooks)
```javascript
// Component-level state
const [bottles, setBottles] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Custom hooks for complex logic
const { data, loading, error } = useBottles(organizationId);
const { pagination, handlePageChange } = usePagination();
```

### Routing Architecture

#### Route Structure
```javascript
// src/App.jsx
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/create-organization" element={<CreateOrganization />} />
  
  {/* Protected Routes */}
  <Route path="/home" element={
    <ProtectedRoute>
      <MainLayout>
        <Home />
      </MainLayout>
    </ProtectedRoute>
  } />
  
  {/* Role-based Routes */}
  <Route path="/admin" element={
    <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
      <MainLayout>
        <AdminPanel />
      </MainLayout>
    </RoleProtectedRoute>
  } />
  
  {/* Owner Portal Routes */}
  <Route path="/owner-portal/*" element={
    <OwnerProtectedRoute>
      <OwnerPortal />
    </OwnerProtectedRoute>
  } />
</Routes>
```

## Mobile Architecture

### React Native Structure

```
App
├── NavigationContainer
│   ├── AuthStack
│   │   ├── LoginScreen
│   │   ├── RegisterScreen
│   │   └── ForgotPasswordScreen
│   ├── MainStack
│   │   ├── HomeScreen
│   │   ├── BottleListScreen
│   │   ├── CustomerListScreen
│   │   ├── RentalListScreen
│   │   ├── DeliveryListScreen
│   │   └── SettingsScreen
│   └── OwnerStack
│       ├── AnalyticsScreen
│       ├── UserManagementScreen
│       └── SystemHealthScreen
├── AuthProvider
├── OfflineProvider
└── NotificationProvider
```

### Offline Architecture

#### Data Synchronization
```javascript
// Offline data management
class OfflineManager {
  async syncData() {
    const pendingChanges = await this.getPendingChanges();
    const conflicts = await this.resolveConflicts(pendingChanges);
    await this.uploadChanges(conflicts);
    await this.downloadUpdates();
  }
  
  async getPendingChanges() {
    return await AsyncStorage.getItem('pending_changes');
  }
  
  async resolveConflicts(changes) {
    // Conflict resolution logic
    return changes;
  }
}
```

#### Local Storage
```javascript
// SQLite for offline storage
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('gas_cylinder_app.db');

// Create tables
db.transaction(tx => {
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS bottles (
      id TEXT PRIMARY KEY,
      serial_number TEXT,
      status TEXT,
      last_sync TIMESTAMP
    );
  `);
});
```

## Security Architecture

### Authentication Flow

```
1. User Login
   ↓
2. Supabase Auth
   ↓
3. JWT Token Generated
   ↓
4. Token Stored Securely
   ↓
5. API Requests with Token
   ↓
6. RLS Policies Applied
   ↓
7. Data Access Granted/Denied
```

### Security Layers

#### 1. Network Security
- HTTPS/TLS encryption
- API rate limiting
- CORS configuration
- Request validation

#### 2. Application Security
- Input sanitization
- XSS prevention
- CSRF protection
- SQL injection prevention

#### 3. Data Security
- Row Level Security (RLS)
- Data encryption at rest
- Secure key management
- Audit logging

#### 4. Access Control
- Role-based permissions
- Multi-factor authentication
- Session management
- Token expiration

### Security Policies

#### RLS Policies
```sql
-- Organization isolation
CREATE POLICY "organization_isolation" ON bottles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Role-based access
CREATE POLICY "admin_access" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );
```

## Performance Architecture

### Frontend Performance

#### 1. Code Splitting
```javascript
// Lazy loading components
const BottleManagement = lazy(() => import('./pages/BottleManagement'));
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));

// Route-based splitting
const routes = [
  {
    path: '/bottles',
    component: lazy(() => import('./pages/BottleManagement'))
  }
];
```

#### 2. Caching Strategy
```javascript
// Query optimization with caching
const useBottles = (organizationId) => {
  return useQuery({
    queryKey: ['bottles', organizationId],
    queryFn: () => fetchBottles(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};
```

#### 3. Virtual Scrolling
```javascript
// Virtualized lists for large datasets
import { FixedSizeList as List } from 'react-window';

const VirtualizedBottleList = ({ bottles }) => (
  <List
    height={600}
    itemCount={bottles.length}
    itemSize={50}
    itemData={bottles}
  >
    {BottleRow}
  </List>
);
```

### Database Performance

#### 1. Indexing Strategy
```sql
-- Composite indexes for common queries
CREATE INDEX idx_bottles_org_status ON bottles(organization_id, status);
CREATE INDEX idx_rentals_customer_date ON rentals(customer_id, rental_start_date);
CREATE INDEX idx_deliveries_date_status ON deliveries(delivery_date, status);

-- Partial indexes for filtered data
CREATE INDEX idx_active_bottles ON bottles(organization_id) 
WHERE status = 'active';
```

#### 2. Query Optimization
```sql
-- Optimized queries with proper joins
SELECT 
  b.id,
  b.serial_number,
  b.status,
  c.name as customer_name,
  r.rental_start_date
FROM bottles b
LEFT JOIN rentals r ON b.id = r.bottle_id
LEFT JOIN customers c ON r.customer_id = c.id
WHERE b.organization_id = $1
  AND b.status = 'rented'
ORDER BY r.rental_start_date DESC
LIMIT 20;
```

#### 3. Connection Pooling
```javascript
// Supabase connection pooling
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);
```

## Scalability Considerations

### Horizontal Scaling

#### 1. Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling
- Query optimization
- Partitioning large tables

#### 2. Application Scaling
- Stateless application design
- Load balancing
- CDN for static assets
- Edge computing for global performance

#### 3. Caching Strategy
- Redis for session storage
- CDN for static assets
- Browser caching
- Application-level caching

### Vertical Scaling

#### 1. Resource Optimization
- Memory usage optimization
- CPU-intensive task optimization
- Database query optimization
- Asset optimization

#### 2. Performance Monitoring
- Application performance monitoring
- Database performance monitoring
- User experience monitoring
- Error tracking and alerting

## Data Flow

### User Interaction Flow

```
1. User Action (Click, Form Submit)
   ↓
2. Event Handler
   ↓
3. State Update (Local/Global)
   ↓
4. API Call (Supabase)
   ↓
5. Database Query
   ↓
6. RLS Policy Check
   ↓
7. Data Return
   ↓
8. State Update
   ↓
9. UI Re-render
   ↓
10. User Feedback
```

### Real-time Data Flow

```
1. Database Change
   ↓
2. Supabase Realtime
   ↓
3. WebSocket Message
   ↓
4. Client Subscription
   ↓
5. State Update
   ↓
6. UI Re-render
   ↓
7. User Notification
```

## Integration Patterns

### External API Integration

#### 1. REST API Integration
```javascript
// External API client
class ExternalAPIClient {
  async fetchData(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

#### 2. Webhook Integration
```javascript
// Webhook handler
app.post('/webhooks/external', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'customer.created':
      handleCustomerCreated(data);
      break;
    case 'order.updated':
      handleOrderUpdated(data);
      break;
    default:
      console.log('Unknown webhook event:', event);
  }
  
  res.status(200).json({ received: true });
});
```

### Third-party Service Integration

#### 1. Payment Processing
```javascript
// Stripe integration
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: currency,
    metadata: {
      organization_id: organizationId
    }
  });
  
  return paymentIntent;
};
```

#### 2. Email Service Integration
```javascript
// Email service integration
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: to,
    subject: subject,
    html: html
  };
  
  return await transporter.sendMail(mailOptions);
};
```

## Monitoring and Observability

### Application Monitoring

#### 1. Error Tracking
```javascript
// Sentry error tracking
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter sensitive data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  }
});
```

#### 2. Performance Monitoring
```javascript
// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.loadEventEnd - entry.loadEventStart);
    }
  }
});

performanceObserver.observe({ entryTypes: ['navigation'] });
```

### Business Metrics

#### 1. User Analytics
```javascript
// User analytics tracking
const trackUserAction = (action, properties = {}) => {
  if (process.env.NODE_ENV === 'production') {
    mixpanel.track(action, {
      ...properties,
      user_id: getCurrentUserId(),
      organization_id: getCurrentOrganizationId(),
      timestamp: new Date().toISOString()
    });
  }
};
```

#### 2. Business Intelligence
```sql
-- Business metrics queries
CREATE VIEW business_metrics AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT b.id) as total_bottles,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT r.id) as total_rentals,
  SUM(r.daily_rate * EXTRACT(DAYS FROM (r.rental_end_date - r.rental_start_date))) as total_revenue
FROM organizations o
LEFT JOIN bottles b ON o.id = b.organization_id
LEFT JOIN customers c ON o.id = c.organization_id
LEFT JOIN rentals r ON o.id = r.organization_id
GROUP BY o.id, o.name;
```

## Future Architecture Considerations

### Microservices Migration

#### 1. Service Decomposition
- User Management Service
- Inventory Management Service
- Rental Management Service
- Delivery Management Service
- Notification Service
- Analytics Service

#### 2. API Gateway
- Request routing
- Authentication
- Rate limiting
- Request/response transformation
- Monitoring and logging

### Event-Driven Architecture

#### 1. Event Sourcing
- Domain events
- Event store
- Event replay
- CQRS pattern

#### 2. Message Queues
- Asynchronous processing
- Event publishing
- Event consumption
- Dead letter queues

### Cloud-Native Architecture

#### 1. Containerization
- Docker containers
- Kubernetes orchestration
- Service mesh
- Observability

#### 2. Serverless Functions
- Edge functions
- Event-driven functions
- Auto-scaling
- Pay-per-use model

## Conclusion

The Gas Cylinder Management System architecture is designed to be scalable, maintainable, and performant. It follows modern architectural patterns and best practices, ensuring the system can grow with business needs while maintaining high performance and reliability.

Key architectural strengths:
- **Scalability**: Horizontal and vertical scaling capabilities
- **Security**: Multi-layered security approach
- **Performance**: Optimized for speed and efficiency
- **Maintainability**: Clean separation of concerns
- **Flexibility**: Modular design for easy modifications
- **Observability**: Comprehensive monitoring and logging

The architecture supports current business requirements while providing a foundation for future growth and technological evolution.
