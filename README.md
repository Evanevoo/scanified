# Gas Cylinder Management System

A comprehensive web and mobile application for managing gas cylinder inventory, customer relationships, rental operations, and maintenance workflows.

## 🚀 Features

### Core Functionality
- **Asset Management**: Track gas cylinders with barcode scanning, serial numbers, and detailed specifications
- **Customer Management**: Complete customer database with contact information, billing details, and rental history
- **Rental Operations**: Manage rental agreements, pricing, and payment tracking
- **Delivery Management**: Schedule and track deliveries with route optimization
- **Maintenance Workflows**: Custom maintenance schedules, inspection tracking, and service records
- **Inventory Tracking**: Real-time inventory levels, location tracking, and status monitoring

### Advanced Features
- **Route Optimization**: AI-powered delivery route planning and optimization
- **Pallet Management**: Bulk scanning operations and palletization system
- **Hazmat Compliance**: Manifest generation and regulatory compliance tracking
- **Chain of Custody**: Complete audit trail and documentation workflows
- **Advanced Rentals**: Demurrage calculations and bracket-based pricing
- **Analytics Dashboard**: Comprehensive reporting and business intelligence

### Mobile Capabilities
- **Offline Support**: Full functionality without internet connection
- **Barcode Scanning**: Quick asset identification and management
- **Push Notifications**: Real-time updates and alerts
- **Data Synchronization**: Automatic sync when connection is restored
- **Mobile Analytics**: Performance metrics and data health monitoring

### Owner Portal
- **Multi-Organization Management**: Manage multiple organizations from a single interface
- **User Management**: Role-based access control and user administration
- **System Health**: Monitor application performance and database health
- **Billing Management**: Subscription management and payment processing
- **Support Tickets**: Customer support and issue tracking
- **Audit Logs**: Complete activity tracking and compliance reporting

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0** - Modern web application framework
- **Vite 5.0.8** - Fast build tool and development server
- **Tailwind CSS 3.3.6** - Utility-first CSS framework
- **Material-UI 5.14.20** - React component library
- **React Router 6.20.1** - Client-side routing
- **Zustand 4.4.7** - State management
- **JavaScript (JSX)** - Primary web app source; TypeScript used in some mobile and UI modules

### Mobile
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **React Navigation** - Navigation library
- **Expo Notifications** - Push notification system
- **AsyncStorage** - Local data persistence
- **SQLite** - Offline database storage

### Backend
- **Supabase** - Backend-as-a-Service platform
- **PostgreSQL** - Relational database
- **PostgREST** - RESTful API generation
- **Supabase Auth** - Authentication system
- **Supabase Realtime** - Real-time subscriptions
- **Supabase Storage** - File storage service

### Infrastructure
- **Vercel/Netlify** - Web application hosting
- **EAS** - Mobile app deployment
- **GitHub Actions** - CI/CD pipeline
- **Docker** - Containerization
- **Sentry** - Error tracking and monitoring
- **Mixpanel** - Analytics and user tracking

## 📋 Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Git** version control
- **Supabase** account
- **Apple Developer** account (for iOS)
- **Google Play Console** account (for Android)

## 🚀 Quick Start

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

### 3. Environment Setup

Create environment files:

```bash
# Copy environment template
cp env.template .env.development

# Edit environment variables
nano .env.development
```

Required environment variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your-email@gmail.com
VITE_SMTP_PASS=your-app-password
```

### 4. Database Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### 5. Start Development Server

```bash
# Start web application
npm run dev

# Start mobile application (in separate terminal)
cd gas-cylinder-mobile
npm start
```

## 📱 Mobile App Setup

### iOS Development

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile development
```

### Android Development

```bash
# Build for Android
eas build --platform android --profile development

# Run on Android device
eas build --platform android --profile preview
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Structure

```
src/tests/
├── components/          # Component tests
├── hooks/              # Hook tests
├── utils/              # Utility tests
├── setup.js            # Test setup
└── __mocks__/          # Mock files
```

## 🚀 Deployment

### Web Application

#### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

#### Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Mobile Application

#### iOS App Store

```bash
# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

#### Android Play Store

```bash
# Build for production
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

## 📚 Documentation

- [API Documentation](docs/API.md) - Complete API reference
- [Component Documentation](docs/COMPONENTS.md) - React component library
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions
- [Architecture Documentation](docs/ARCHITECTURE.md) - System architecture overview

## 🔧 Configuration

### Database Configuration

The application uses Supabase PostgreSQL with the following key tables:

- `organizations` - Organization management
- `profiles` - User profiles and roles
- `bottles` - Gas cylinder inventory
- `customers` - Customer database
- `rentals` - Rental agreements
- `deliveries` - Delivery management
- `maintenance_records` - Maintenance tracking

### Security Configuration

- **Row Level Security (RLS)** - Data isolation between organizations
- **JWT Authentication** - Secure user authentication
- **Role-Based Access Control** - Granular permissions
- **API Rate Limiting** - Protection against abuse

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards

- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **TypeScript** - Type safety
- **Jest** - Unit testing
- **Testing Library** - Component testing

### Commit Convention

We follow conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

## 📊 Performance

### Web Application
- **Lighthouse Score**: 95+ across all metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.0s

### Mobile Application
- **App Launch Time**: < 2s
- **Offline Sync**: < 5s for 1000 records
- **Barcode Scan**: < 200ms
- **Push Notification**: < 1s delivery

## 🔒 Security

### Security Features
- **HTTPS/TLS** - Encrypted communication
- **JWT Tokens** - Secure authentication
- **Row Level Security** - Database-level access control
- **Input Validation** - XSS and injection prevention
- **Rate Limiting** - API abuse protection
- **Audit Logging** - Complete activity tracking

### Security Best Practices
- Regular security audits
- Dependency vulnerability scanning
- Secure coding practices
- Data encryption at rest and in transit
- Multi-factor authentication support

## 📈 Monitoring

### Application Monitoring
- **Sentry** - Error tracking and performance monitoring
- **Mixpanel** - User analytics and behavior tracking
- **Supabase Analytics** - Database performance monitoring
- **Custom Metrics** - Business-specific KPIs

### Health Checks
- Database connectivity
- API endpoint availability
- File storage access
- Authentication service status
- Real-time subscription health

## 🆘 Support

### Getting Help
- **Documentation**: Comprehensive guides and API reference
- **GitHub Issues**: Bug reports and feature requests
- **Email Support**: support@gascylinderapp.com
- **Status Page**: https://status.gascylinderapp.com

### Common Issues
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [FAQ](docs/FAQ.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Vercel** - Web hosting platform
- **Expo** - Mobile development platform
- **Material-UI** - React component library
- **Tailwind CSS** - CSS framework
- **React** - Web application framework
- **React Native** - Mobile application framework

## 📞 Contact

- **Website**: https://gascylinderapp.com
- **Email**: contact@gascylinderapp.com
- **GitHub**: https://github.com/gascylinderapp
- **Twitter**: @gascylinderapp
- **LinkedIn**: Gas Cylinder Management System

---

**Built with ❤️ for the gas cylinder industry**