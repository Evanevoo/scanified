# Scanified - iOS Mobile App

A professional iOS mobile application for gas cylinder management, built with Expo and Supabase.

## 🚀 Features

- **Authentication**: Secure login with Supabase
- **Barcode Scanning**: Camera-based barcode scanning for cylinders and customers
- **Offline Support**: Work offline with automatic sync when connected
- **Real-time Sync**: Automatic data synchronization with the web app
- **Theme Support**: Light, dark, and auto theme modes
- **Role-based Access**: Different features based on user roles
- **Error Handling**: Comprehensive error handling and user feedback
- **Performance Optimized**: Lazy loading and efficient data management

## 📱 Screens

- **Home**: Main dashboard with quick actions
- **Scan Cylinders**: Barcode scanning for cylinders
- **Edit Cylinder**: Modify cylinder information
- **Locate Cylinder**: Find cylinder locations
- **Add Cylinder**: Add new cylinders to the system
- **History**: View scan history
- **Fill Cylinder**: Update cylinder status
- **Settings**: App configuration and user management
- **Customer Details**: View and manage customer information

## 🛠️ Tech Stack

- **React Native**: iOS mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type-safe JavaScript
- **Supabase**: Backend as a Service (BaaS)
- **React Navigation**: Navigation library
- **AsyncStorage**: Local data persistence
- **Expo Camera**: Camera and barcode scanning

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Xcode (for iOS builds)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd gas-cylinder-mobile
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server

```bash
npm start
```

### 4. Run on Device/Simulator

- **iOS**: Press `i` in the terminal or scan QR code with Expo Go app

## 🏗️ Project Structure

```
gas-cylinder-mobile/
├── components/          # Reusable UI components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── screens/            # Screen components
├── services/           # API and business logic services
├── utils/              # Utility functions and helpers
├── assets/             # Images, fonts, and static assets
├── App.tsx             # Main app component
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## 🔧 Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

### Code Style

The project uses ESLint and TypeScript for code quality:

```bash
npm run lint          # Check for linting errors
npm run lint:fix      # Fix auto-fixable linting errors
npm run type-check    # Check TypeScript types
```

## 🧪 Testing

The app includes comprehensive testing setup:

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

### Testing Structure

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows

## 🔐 Authentication

The mobile app uses the same authentication system as the web app:

- **Supabase Auth**: Secure authentication with email/password
- **Session Management**: Automatic session persistence
- **Role-based Access**: Different features based on user roles
- **Secure Storage**: Encrypted local storage for sensitive data

## 📡 Offline Support

The app works offline with automatic synchronization:

- **Local Storage**: Data stored locally using AsyncStorage
- **Sync Service**: Automatic sync when connection is restored
- **Conflict Resolution**: Handles data conflicts gracefully
- **Status Indicators**: Shows sync status and pending items

## 🎨 Theming

The app supports multiple themes:

- **Light Theme**: Clean, bright interface
- **Dark Theme**: Dark mode for low-light environments
- **Auto Theme**: Follows system theme preferences

## 🔧 Configuration

### Settings

The app includes comprehensive settings:

- **Theme Selection**: Choose app theme
- **Sound & Vibration**: Toggle audio and haptic feedback
- **Offline Mode**: Enable/disable offline functionality
- **Auto Sync**: Configure automatic data synchronization
- **User Management**: Admin features for user management

### Environment Variables

Required environment variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Deployment

### Building for Production

```bash
# Build for iOS
npm run build:ios

# Build for iOS only (optimized)
npm run build:ios-only
```

### App Store Deployment

1. Configure app.json with your app details
2. Build the app using EAS Build
3. Submit to App Store Connect (iOS)

## 🔒 Security

- **Secure Authentication**: Uses Supabase's secure auth system
- **Data Encryption**: Sensitive data encrypted in transit and at rest
- **Input Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Secure error messages without exposing sensitive information

## 📊 Performance

- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Optimized images and assets
- **Memory Management**: Efficient memory usage
- **Background Sync**: Non-blocking data synchronization

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `expo start -c`
2. **Build failures**: Check environment variables and dependencies
3. **Camera permissions**: Ensure camera permissions are granted
4. **Sync issues**: Check network connectivity and Supabase configuration

### Debug Mode

Enable debug mode for development:

```bash
EXPO_DEBUG=true npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:

- Check the documentation
- Review existing issues
- Create a new issue with detailed information
- Contact the development team

## 🔄 Updates

Keep the app updated:

```bash
npm update              # Update dependencies
expo upgrade           # Upgrade Expo SDK
```

## 📈 Analytics

The app includes performance monitoring:

- **Error Tracking**: Automatic error reporting
- **Performance Metrics**: App performance monitoring
- **Usage Analytics**: User behavior tracking
- **Crash Reporting**: Automatic crash reporting

## 🔮 Future Enhancements

- **Push Notifications**: Real-time notifications
- **Advanced Scanning**: Enhanced barcode scanning features
- **Offline Maps**: Offline map support for location tracking
- **Voice Commands**: Voice-controlled operations
- **AR Features**: Augmented reality for cylinder identification 