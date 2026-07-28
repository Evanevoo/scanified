# Scanified - Technical Documentation

## System Architecture

### Overview
Scanified is a full-stack application built with modern web and mobile technologies, designed for scalability, security, and offline-first capabilities.

---

## Technology Stack

### Frontend (Web)
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context + Hooks
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Charts**: Recharts / Chart.js

### Mobile Applications
- **Framework**: React Native
- **Platform**: Expo SDK 53
- **Navigation**: React Navigation
- **Camera**: expo-camera
- **Barcode Scanner**: expo-barcode-scanner
- **Storage**: AsyncStorage
- **Network Detection**: @react-native-community/netinfo

### Backend & Database
- **Backend**: Supabase (PostgreSQL + REST API)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Database**: PostgreSQL 15

### Deployment
- **Web**: Netlify
- **Mobile**: Expo EAS Build
- **CI/CD**: GitHub Actions (recommended)

---

## Project Structure

```
gas-cylinder-app/
├── src/                          # Web application source
│   ├── components/               # Reusable React components
│   │   ├── ui/                  # UI components (buttons, cards, etc.)
│   │   └── layout/              # Layout components (header, sidebar)
│   ├── pages/                    # Page components (routes)
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.jsx          # Authentication hook
│   │   ├── usePermissions.jsx   # Authorization hook
│   │   └── useOptimizedFetch.jsx # Data fetching hook
│   ├── services/                 # Business logic & API calls
│   │   ├── deliveryService.js
│   │   ├── truckReconciliationService.js
│   │   ├── MaintenanceScheduler.js
│   │   └── CustomerBillingService.js
│   ├── supabase/                 # Supabase configuration
│   │   └── client.js            # Supabase client setup
│   ├── utils/                    # Utility functions
│   │   ├── logger.js            # Production-safe logger
│   │   └── importValidation.js  # Import validation utilities
│   ├── App.jsx                   # Main app component
│   └── main.jsx                  # Entry point
│
├── gas-cylinder-mobile/          # iOS app source
│   ├── screens/                  # Screen components
│   ├── components/               # Reusable components
│   ├── services/                 # Services (sync, notifications)
│   ├── utils/                    # Utilities
│   ├── supabase.ts              # Supabase config
│   └── App.tsx                   # Main app
│
├── gas-cylinder-android/         # Android app source
│   ├── screens/                  # Screen components
│   ├── components/               # Reusable components
│   ├── services/                 # Services
│   │   ├── NotificationService.ts
│   │   ├── SyncService.ts
│   │   └── ConflictResolutionService.ts
│   ├── utils/                    # Utilities
│   ├── assets/                   # Images, icons
│   ├── supabase.ts              # Supabase config
│   └── App.tsx                   # Main app
│
├── public/                       # Static assets (web)
├── scripts/                      # Utility scripts
└── netlify/functions/            # Serverless functions
```

---

## Database Schema

### Core Tables

#### `profiles`
User profile information
```sql
- id (uuid, primary key)
- email (text)
- full_name (text)
- role (text) -- 'owner', 'admin', 'manager', 'user'
- organization_id (uuid, foreign key)
- is_active (boolean)
- disabled_at (timestamp)
- disabled_reason (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `organizations`
Organization/company information
```sql
- id (uuid, primary key)
- name (text)
- app_name (text)
- email (text)
- phone (text)
- address (text)
- subscription_status (text)
- trial_end_date (timestamp)
- deleted_at (timestamp)
- deletion_reason (text)
- created_at (timestamp)
```

#### `customers`
Customer information
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- name (text)
- CustomerListID (text)
- email (text)
- phone (text)
- address (text)
- city (text)
- province (text)
- postal_code (text)
- country (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `bottles` / `cylinders`
Gas cylinder inventory
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- barcode_number (text, unique)
- serial_number (text)
- product_code (text)
- gas_type (text)
- size (text)
- status (text) -- 'available', 'rented', 'maintenance', 'retired'
- location (text)
- assigned_customer (uuid, foreign key)
- customer_name (text)
- fill_count (integer)
- last_filled_date (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `deliveries`
Delivery orders
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- customer_id (uuid, foreign key)
- delivery_type (text) -- 'delivery', 'pickup', 'exchange'
- status (text) -- 'pending', 'in_transit', 'completed', 'cancelled'
- scheduled_date (timestamp)
- completed_date (timestamp)
- driver_id (uuid, foreign key)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `delivery_items`
Items in a delivery
```sql
- id (uuid, primary key)
- delivery_id (uuid, foreign key)
- bottle_id (uuid, foreign key)
- quantity (integer)
- created_at (timestamp)
```

#### `invoices`
Customer invoices
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- customer_id (uuid, foreign key)
- invoice_number (text, unique)
- invoice_date (date)
- due_date (date)
- total_amount (decimal)
- amount_paid (decimal)
- status (text) -- 'paid', 'pending', 'overdue', 'cancelled'
- line_items (jsonb)
- notes (text)
- created_at (timestamp)
```

#### `maintenance_workflows`
Maintenance workflow definitions
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- name (text)
- description (text)
- category (text)
- priority (text)
- frequency (text)
- status (text)
- checklist_items (jsonb)
- required_parts (jsonb)
- safety_requirements (jsonb)
- created_by (uuid, foreign key)
- assigned_to (uuid, foreign key)
- created_at (timestamp)
```

#### `maintenance_schedules`
Automated maintenance schedules
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- workflow_id (uuid, foreign key)
- frequency_type (text) -- 'daily', 'weekly', 'monthly', etc.
- frequency_value (integer)
- start_date (date)
- end_date (date)
- time_of_day (time)
- days_of_week (integer[])
- day_of_month (integer)
- is_active (boolean)
- auto_create_tasks (boolean)
- created_at (timestamp)
```

#### `delivery_manifests`
Truck reconciliation manifests
```sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- manifest_number (text, unique)
- driver_id (uuid, foreign key)
- truck_id (text)
- manifest_date (date)
- status (text)
- expected_out (integer)
- expected_in (integer)
- expected_exchange (integer)
- created_at (timestamp)
```

---

## Authentication & Authorization

### Authentication Flow

1. **User Registration**
   - User submits email/password to Supabase Auth
   - Supabase creates auth user
   - Trigger creates profile record
   - User redirected to organization setup

2. **User Login**
   - Credentials sent to Supabase Auth
   - Session token returned
   - Profile and organization data loaded
   - User redirected to dashboard

3. **Session Management**
   - JWT stored in localStorage (handled by Supabase)
   - Auto-refresh before expiration
   - Session checked on route changes
   - Inactive sessions expire after timeout

### Authorization (RLS Policies)

Row Level Security policies enforce data isolation:

```sql
-- Example: Bottles table RLS
CREATE POLICY "Users can view own org bottles"
ON bottles FOR SELECT
USING (organization_id = auth.organization_id());

CREATE POLICY "Admins can modify bottles"
ON bottles FOR ALL
USING (
  organization_id = auth.organization_id()
  AND auth.user_role() IN ('owner', 'admin', 'manager')
);
```

### Role Hierarchy
- **Owner**: Full system access, billing, user management
- **Admin**: All features except billing/subscription
- **Manager**: Operational features, reports, cannot manage users
- **User**: View-only access, mobile scanning

---

## API & Services

### Supabase Client
```javascript
// src/supabase/client.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Service Layer Pattern

All business logic organized in service classes:

```javascript
// Example: DeliveryService
export class DeliveryService {
  static async createDelivery(data) {
    // Validation
    // Database operations
    // Error handling
    // Return result
  }

  static async updateDeliveryStatus(id, status) {
    // ...
  }
}
```

### Data Fetching Hooks

Custom hooks for optimized data fetching:

```javascript
// useOptimizedFetch.jsx
export function useOptimizedFetch(fetchFunction, dependencies) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetchFunction(controller.signal)
      .then(result => {
        if (isMounted) setData(result);
      })
      .catch(err => {
        if (isMounted && !controller.signal.aborted) {
          setError(err);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, dependencies);

  return { data, loading, error, refetch };
}
```

---

## Mobile Architecture

### Offline-First Strategy

1. **Local Storage**
   - AsyncStorage for persistent data
   - In-memory cache for active session

2. **Sync Queue**
   - Operations queued when offline
   - Auto-sync when connection restored
   - Conflict resolution on sync

3. **Conflict Resolution**
   ```typescript
   // Last-write-wins strategy
   export class ConflictResolutionService {
     resolveConflict(localData, remoteData) {
       if (new Date(localData.updated_at) > new Date(remoteData.updated_at)) {
         return localData;
       }
       return remoteData;
     }
   }
   ```

### Notification Service

```typescript
// NotificationService.ts
export class NotificationService {
  async initialize() {
    // Request permissions
    // Register for push notifications
    // Set notification handlers
  }

  async sendLocalNotification(params) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data
      },
      trigger: null // Immediate
    });
  }
}
```

---

## Performance Optimization

### Web Application

1. **Code Splitting**
   ```javascript
   // Lazy load routes
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Memoization**
   ```javascript
   const MemoizedComponent = React.memo(ExpensiveComponent);
   const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
   ```

3. **Virtualized Lists**
   - Use react-window for large lists
   - Pagination for API responses

4. **Image Optimization**
   - Lazy loading with Intersection Observer
   - WebP format where supported
   - Responsive images

### Database Optimization

1. **Indexes**
   ```sql
   CREATE INDEX idx_bottles_barcode ON bottles(barcode_number);
   CREATE INDEX idx_bottles_org ON bottles(organization_id);
   CREATE INDEX idx_deliveries_status ON deliveries(status, organization_id);
   ```

2. **Query Optimization**
   - Select only needed columns
   - Use appropriate joins
   - Filter early in query
   - Use prepared statements

### Mobile Optimization

1. **Memory Management**
   - Clean up listeners on unmount
   - Cancel pending requests
   - Clear cache periodically

2. **Network Efficiency**
   - Batch API requests
   - Compress payloads
   - Cache responses
   - Debounce/throttle inputs

---

## Security Best Practices

### Environment Variables

```bash
# .env.example
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Never commit actual `.env` files!

### XSS Prevention
- All user input sanitized
- Dangerous HTML escaped
- Content Security Policy headers

### SQL Injection Prevention
- Parameterized queries (Supabase handles this)
- Input validation
- Type checking

### Authentication Security
- HTTPS only
- Secure password requirements
- Rate limiting on login attempts
- Session expiration
- Token rotation

---

## Deployment

### Web Application (Netlify)

1. **Build Configuration**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Environment Variables**
   - Set in Netlify dashboard
   - Or use Netlify CLI

3. **Deploy**
   ```bash
   npm run build
   netlify deploy --prod
   ```

### Mobile Applications (Expo)

1. **Build Configuration**
   ```json
   // app.json
   {
     "expo": {
       "name": "Scanified",
       "version": "1.0.0",
       "ios": { ... },
       "android": { ... }
     }
   }
   ```

2. **Build & Submit**
   ```bash
   # Android
   eas build --platform android
   eas submit -p android

   # iOS
   eas build --platform ios
   eas submit -p ios
   ```

---

## Monitoring & Logging

### Recommended Tools

- **Error Tracking**: Sentry
- **Analytics**: Google Analytics, Mixpanel
- **Performance**: Lighthouse, Web Vitals
- **Uptime**: UptimeRobot, Pingdom
- **Logs**: Supabase Dashboard, CloudWatch

### Logger Utility

```javascript
// utils/logger.js
export const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args) => {
    console.error(...args);
    // Send to error tracking service
  },
  warn: (...args) => {
    console.warn(...args);
  }
};
```

---

## Testing Strategy

### Unit Tests
- Jest for JavaScript
- React Testing Library for components
- Target: 80% code coverage

### Integration Tests
- Test API interactions
- Database operations
- Service layer functions

### E2E Tests
- Cypress for web
- Detox for mobile
- Test critical user flows

### Manual Testing
- See TESTING_CHECKLIST.md
- Test on multiple devices/browsers
- Verify offline functionality

---

## Troubleshooting

### Common Issues

**Issue**: CORS errors
**Solution**: Configure Supabase CORS settings

**Issue**: Build fails
**Solution**: Clear node_modules, reinstall dependencies

**Issue**: Slow queries
**Solution**: Add database indexes, optimize queries

**Issue**: Mobile app crashes
**Solution**: Check error logs, update dependencies

---

## Future Enhancements

### Planned Features
- Real-time collaboration
- Advanced analytics with ML
- IoT sensor integration
- Voice commands
- AR for cylinder identification

### Technical Debt
- Add comprehensive unit tests
- Implement E2E test automation
- Optimize bundle size further
- Add service worker for PWA
- Implement GraphQL for complex queries

---

## Contributing

### Development Setup

1. Clone repository
   ```bash
   git clone https://github.com/Evanevoo/scanified.git
   cd scanified
   ```

2. Install dependencies
   ```bash
   npm install
   cd gas-cylinder-mobile && npm install
   cd ../gas-cylinder-android && npm install
   ```

3. Set up environment
   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

4. Run development server
   ```bash
   npm run dev  # Web
   npm start    # Mobile (in respective directory)
   ```

### Code Style

- Use ESLint configuration
- Follow React best practices
- Write meaningful commit messages
- Add JSDoc comments for functions

---

## Support & Contact

- **Technical Issues**: dev@scanified.com
- **Documentation**: docs.scanified.com
- **GitHub**: github.com/Evanevoo/scanified

---

*Last Updated: October 30, 2025*
*Version: 1.0.0*

