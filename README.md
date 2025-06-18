# Gas Cylinder Management System

A comprehensive full-stack application for managing gas cylinder inventory, customers, rentals, and business operations.

## 🚀 Features

### Core Functionality
- **Customer Management** - Complete customer database with search and filtering
- **Cylinder Tracking** - Barcode and serial number tracking for all cylinders
- **Rental Management** - Track cylinder rentals, returns, and billing
- **Import System** - Bulk import with approval workflows
- **Reporting** - Comprehensive management reports and analytics
- **Mobile App** - React Native mobile application for field operations

### Technical Features
- **Lazy Loading** - Code splitting for improved performance
- **Error Handling** - Comprehensive error boundaries and handling
- **State Management** - Global state with Zustand
- **Input Validation** - Robust form validation and sanitization
- **Rate Limiting** - API rate limiting to prevent abuse
- **Authentication** - Role-based access control
- **Real-time Updates** - Background services for data synchronization

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Fast build tool and development server
- **Material-UI** - Comprehensive UI component library
- **React Router** - Client-side routing
- **Zustand** - Lightweight state management
- **React Hot Toast** - Toast notifications

### Backend
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **PostgreSQL** - Relational database
- **Row Level Security** - Database-level security policies

### Mobile
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **React Navigation** - Mobile navigation

### Development Tools
- **TypeScript** - Type safety and better developer experience
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Expo CLI (for mobile development)

### Web Application Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gas-cylinder-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### Mobile Application Setup

1. **Navigate to mobile directory**
   ```bash
   cd gas-cylinder-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Expo development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   ```

## 🏗️ Architecture

### Project Structure
```
gas-cylinder-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── MainLayout.jsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useErrorHandler.js
│   │   └── useRateLimitedApi.js
│   ├── pages/              # Page components
│   │   ├── Home.jsx
│   │   ├── Customers.jsx
│   │   └── management-reports/
│   ├── store/              # Global state management
│   │   └── appStore.js
│   ├── utils/              # Utility functions
│   │   ├── validation.js
│   │   └── backgroundService.js
│   └── supabase/           # Database configuration
│       └── client.js
├── gas-cylinder-mobile/    # Mobile application
└── backups/               # Automated backups
```

### Key Components

#### Error Handling
- **ErrorBoundary** - Catches React errors and displays user-friendly messages
- **useErrorHandler** - Custom hook for standardized error handling
- **Toast Notifications** - User feedback for errors and success states

#### State Management
- **Zustand Store** - Global state for user data, UI state, and notifications
- **Persistent Storage** - Automatic state persistence for user preferences
- **Optimized Selectors** - Individual selectors for better performance

#### Performance Optimizations
- **Lazy Loading** - Route-based code splitting
- **React.memo** - Component memoization for expensive renders
- **Rate Limiting** - API call throttling and queuing
- **Background Services** - Automated data updates

#### Security Features
- **Input Validation** - Comprehensive form validation
- **Input Sanitization** - XSS protection
- **Role-based Access** - User permission management
- **Row Level Security** - Database-level security

## 🔧 Configuration

### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Development Settings
VITE_APP_ENV=development
VITE_API_RATE_LIMIT=1000
VITE_MAX_CONCURRENT_REQUESTS=3
```

### Supabase Setup
1. Create a new Supabase project
2. Run the database migrations
3. Configure Row Level Security policies
4. Set up authentication providers
5. Configure storage buckets

### Database Schema
The application uses the following main tables:
- `profiles` - User profiles and roles
- `customers` - Customer information
- `cylinders` - Cylinder inventory
- `rentals` - Rental transactions
- `invoices` - Billing information
- `import_history` - Import tracking

## 🚀 Deployment

### Web Application (Netlify)
1. Connect your repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set environment variables in Netlify dashboard
4. Deploy automatically on push to main branch

### Mobile Application
1. **Expo Build Service**
   ```bash
   eas build --platform all
   ```

2. **App Store Deployment**
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

## 📊 Monitoring & Analytics

### Error Tracking
- Console logging for development
- Error boundary captures for production
- Supabase error logging

### Performance Monitoring
- Bundle size analysis
- Loading time tracking
- API response time monitoring

### User Analytics
- Page view tracking
- Feature usage analytics
- Error rate monitoring

## 🔒 Security

### Authentication
- Supabase Auth with JWT tokens
- Session management
- Automatic token refresh

### Authorization
- Role-based access control (admin, manager, user)
- Route-level protection
- Component-level permissions

### Data Protection
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/user` - Get current user

### Customer Endpoints
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

### Cylinder Endpoints
- `GET /cylinders` - List cylinders
- `POST /cylinders` - Create cylinder
- `PUT /cylinders/:id` - Update cylinder
- `DELETE /cylinders/:id` - Delete cylinder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style
- Use TypeScript for new components
- Follow ESLint configuration
- Use Prettier for formatting
- Add JSDoc comments for functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Component Documentation](./docs/components.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

### Getting Help
- Create an issue on GitHub
- Check the troubleshooting guide
- Review the FAQ section

## 🔄 Changelog

### Version 2.0.0 (Latest)
- ✨ Added lazy loading and code splitting
- 🛡️ Implemented comprehensive error handling
- 📱 Enhanced mobile application
- 🔒 Improved security features
- ⚡ Performance optimizations
- 📊 Better state management with Zustand
- 🧪 Added input validation utilities

### Version 1.0.0
- 🎉 Initial release
- 📋 Basic CRUD operations
- 🔐 Authentication system
- 📱 Mobile application
- 📊 Basic reporting

## 🙏 Acknowledgments

- Supabase team for the excellent backend service
- Material-UI team for the component library
- React team for the amazing framework
- Expo team for mobile development tools

---

**Built with ❤️ for gas cylinder management** 