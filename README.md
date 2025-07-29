# Gas Cylinder Management Application

A comprehensive gas cylinder tracking and management platform with web and mobile components.

## Recent Updates

### Landing Page Routing Fix (Latest)
- **Issue**: Landing page was automatically redirecting to `/register` for authenticated users without organizations
- **Solution**: Modified routing logic to be less aggressive about redirects
  - Removed automatic redirect from root route (`/`) for users without organizations
  - Updated `ProtectedRoute` to only redirect to register for routes that actually require an organization
  - Added notification banner on landing page for users who need to complete organization setup
  - Users can now browse the landing page freely while being gently prompted to complete setup

### Key Changes Made:
1. **App.jsx**: Removed automatic redirect to `/register` from root route
2. **ProtectedRoute.jsx**: Added whitelist of public routes that don't require organization setup
3. **LandingPage.jsx**: Added notification banner for users who need to complete organization setup

## Project Structure

This project consists of two main applications:

### 1. Web Application (`src/`)
- **Technology Stack**: React.js, Vite, Tailwind CSS, Supabase
- **Features**:
  - Customer management
  - Asset tracking and history
  - Import/export functionality
  - Management reports
  - Accounting and billing
  - User management and authentication

### 2. Mobile Application (`gas-cylinder-mobile/`)
- **Technology Stack**: React Native, Expo, TypeScript
- **Features**:
  - QR code scanning for cylinders
  - Offline data synchronization
  - Real-time updates
  - Customer details management
  - Cylinder filling and location tracking
  - User authentication

## Key Features

### Web Application
- **Customer Management**: Add, edit, and manage customer information
- **Asset Tracking**: Monitor cylinder movements and history
- **Import System**: Bulk import customer and asset data
- **Reporting**: Comprehensive management and accounting reports
- **User Management**: Role-based access control
- **Real-time Updates**: Live data synchronization

### Mobile Application
- **QR Code Scanning**: Scan cylinder QR codes for instant identification
- **Offline Capability**: Work without internet connection with sync when online
- **Cylinder Operations**: Fill, locate, and track cylinder status
- **Customer Details**: View and update customer information
- **History Tracking**: Complete audit trail of cylinder movements

## Technology Stack

### Web Application
- React.js 18+
- Vite (Build tool)
- Tailwind CSS (Styling)
- Supabase (Backend/Database)
- React Router (Navigation)
- Context API (State management)

### Mobile Application
- React Native
- Expo SDK
- TypeScript
- React Navigation
- Supabase Client
- Expo Camera (QR scanning)
- AsyncStorage (Offline data)

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Web Application Setup
```bash
cd src/
npm install
npm run dev
```

### Mobile Application Setup
```bash
cd gas-cylinder-mobile/
npm install
npx expo start
```

## Database Schema

The application uses Supabase as the backend with the following main tables:
- `customers` - Customer information
- `assets` - Cylinder and asset data
- `asset_movements` - Tracking cylinder movements
- `users` - User management
- `scans` - QR code scan history

## Deployment

### Web Application
- Deployed on Vercel/Netlify
- Environment variables configured for Supabase connection

### Mobile Application
- Android APK builds available
- Expo EAS Build for production releases
- Google Play Store ready

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software developed for gas cylinder management operations.

## Support

For technical support or questions, please contact the development team. 