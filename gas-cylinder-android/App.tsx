import React from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';

// Silence known, harmless development warnings in Expo Go - MUST BE FIRST
// Only suppress specific warnings that are not actionable, keep errors visible
if (__DEV__) {
  LogBox.ignoreLogs([
    // Expo Notifications SDK 53+ Expo Go limitation (expected behavior)
    'expo-notifications: Android Push notifications',
    'removed from Expo Go',
    'Use a development build instead',
    // React Navigation warnings
    'Non-serializable values were found in the navigation state',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
    // Expo warnings
    'Constants.platform.ios.model has been deprecated',
    'AsyncStorage has been extracted from react-native',
    // Worklets warnings (camera/video)
    'Worklet',
    '[react-native-reanimated]',
    // Metro bundler warnings
    'Remote debugger is in a background tab',
    // Common harmless warnings
    'VirtualizedLists should never be nested',
    'Possible Unhandled Promise Rejection',
    'Setting a timer for a long period',
    // Supabase/Network warnings
    'Network request failed',
    'Unable to resolve host',
  ]);
}

import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AssetProvider } from './context/AssetContext';
import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/LoadingScreen';
import logger from './utils/logger';

// Import all screens
import HomeScreen from './screens/HomeScreen';
import EnhancedScanScreen from './screens/EnhancedScanScreen';
import ScanCylindersScreen from './screens/ScanCylindersScreen';
import EditCylinderScreen from './screens/EditCylinderScreen';
import CylinderDetailsScreen from './screens/CylinderDetailsScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './LoginScreen';
import FillCylinderScreen from './screens/FillCylinderScreen';
import AddCylinderScreen from './screens/AddCylinderScreen';
import TrackAboutStyleScanScreen from './screens/TrackAboutStyleScanScreen';
import CustomizationScreen from './screens/CustomizationScreen';
import OrganizationJoinScreen from './screens/OrganizationJoinScreen';
import HistoryScreen from './screens/HistoryScreen';
import RecentScansScreen from './screens/RecentScansScreen';
import SupportTicketScreen from './screens/SupportTicketScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import DriverDashboard from './screens/DriverDashboard';
import AnalyticsScreen from './screens/AnalyticsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import { notificationService } from './services/NotificationService';
import { soundService } from './services/soundService';
import { useAppUpdate } from './hooks/useAppUpdate';
import UpdateModal from './components/UpdateModal';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';

const Stack = createNativeStackNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

function AppContent() {
  const { 
    user, 
    profile, 
    organization, 
    loading, 
    organizationLoading, 
    authError,
    sessionTimeoutWarning,
    updateActivity,
    signOut 
  } = useAuth();
  const { updateInfo, openUpdateUrl } = useAppUpdate();
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);

  // Show update modal when update is available (with delay to avoid interrupting app startup)
  React.useEffect(() => {
    if (updateInfo?.hasUpdate) {
      // Delay showing the modal by 2 seconds to allow app to finish loading
      const timeout = setTimeout(() => {
        setShowUpdateModal(true);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [updateInfo]);

  // Initialize services when user is authenticated
  React.useEffect(() => {
    if (user && profile?.organization_id) {
      // Initialize notification service
      // Initialize notification service (gracefully handle Expo Go limitations)
      notificationService.initialize().then(() => {
        notificationService.registerDevice(user.id, profile.organization_id);
      }).catch((error) => {
        // Suppress Expo Go SDK 53+ warning about remote push notifications
        if (error?.message?.includes('removed from Expo Go') || 
            error?.message?.includes('development build')) {
          // This is expected in Expo Go - local notifications still work
          console.log('📱 Notification service: Remote push not available in Expo Go (expected)');
        } else {
          console.error('Error initializing notification service:', error);
        }
      });
      
      // Initialize sound service
      soundService.initialize();
    }
  }, [user?.id, profile?.organization_id]); // Use stable primitives instead of objects to prevent infinite loops

  // Handle session timeout warning actions
  const handleExtendSession = React.useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  const handleLogout = React.useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Track navigation activity to prevent session timeout during active use
  // MUST be defined before any early returns to follow Rules of Hooks
  const handleNavigationStateChange = React.useCallback(() => {
    try {
      // User navigated - update activity to prevent timeout
      if (user) {
        updateActivity();
      }
    } catch (error) {
      // Silently handle errors in activity tracking - don't crash app
      logger.warn('Error updating activity on navigation:', error);
    }
  }, [user, updateActivity]);
  
  if (loading) {
    return <LoadingScreen />;
  }

  // Handle authentication errors
  if (authError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>⚠️ Authentication Error</Text>
          <Text style={styles.text}>{authError}</Text>
          <Text style={styles.subtext}>
            Please restart the app or contact support if the problem persists.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle users without organizations (only show if not loading)
  if (user && !organization && !organizationLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>🏢 No Organization</Text>
          <Text style={styles.text}>
            You are not associated with any organization.
          </Text>
          <Text style={styles.subtext}>
            Please contact your administrator or create a new organization.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while organization is being fetched
  if (user && organizationLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <NavigationContainer onStateChange={handleNavigationStateChange}>
        <Stack.Navigator>
          {!user ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ title: 'Welcome', headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Dashboard', headerShown: false }}
            />
            <Stack.Screen 
              name="ScanCylinders" 
              component={ScanCylindersScreen}
              options={{ title: 'Scan Customer Number' }}
            />
            <Stack.Screen 
              name="EnhancedScan" 
              component={EnhancedScanScreen}
              options={{ title: 'Enhanced Scan' }}
            />
            <Stack.Screen 
              name="EditCylinder" 
              component={EditCylinderScreen}
              options={{ title: 'Edit Cylinder', headerShown: false }}
            />
            <Stack.Screen 
              name="CylinderDetails" 
              component={CylinderDetailsScreen}
              options={{ title: 'Cylinder Details' }}
            />
            <Stack.Screen 
              name="CustomerDetails" 
              component={CustomerDetailsScreen}
              options={{ title: 'Customer Details' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen 
              name="FillCylinder" 
              component={FillCylinderScreen}
              options={{ title: 'Locate Cylinder' }}
            />
            <Stack.Screen 
              name="AddCylinder" 
              component={AddCylinderScreen}
              options={{ title: 'Add Cylinder' }}
            />
            <Stack.Screen 
              name="TrackAboutStyleScan" 
              component={TrackAboutStyleScanScreen}
              options={{ title: 'Track & Scan' }}
            />
            <Stack.Screen 
              name="Customization" 
              component={CustomizationScreen}
              options={{ title: 'Customization' }}
            />
            <Stack.Screen 
              name="OrganizationJoin" 
              component={OrganizationJoinScreen}
              options={{ title: 'Join Organization' }}
            />
            <Stack.Screen 
              name="History" 
              component={HistoryScreen}
              options={{ title: 'History' }}
            />
            <Stack.Screen 
              name="RecentScans" 
              component={RecentScansScreen}
              options={{ title: 'Recent Scans' }}
            />
            <Stack.Screen 
              name="SupportTicket" 
              component={SupportTicketScreen}
              options={{ title: 'Support' }}
            />
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagementScreen}
              options={{ title: 'User Management' }}
            />
            <Stack.Screen 
              name="DriverDashboard" 
              component={DriverDashboard}
              options={{ title: 'Driver Dashboard' }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{ title: 'Analytics' }}
            />
            <Stack.Screen 
              name="NotificationSettings" 
              component={NotificationSettingsScreen}
              options={{ title: 'Notifications' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    
    {/* Update Modal */}
    <UpdateModal
      visible={showUpdateModal}
      updateInfo={updateInfo}
      onUpdate={async () => {
        await openUpdateUrl();
        if (!updateInfo?.isRequired) {
          setShowUpdateModal(false);
        }
      }}
      onDismiss={updateInfo?.isRequired ? undefined : () => setShowUpdateModal(false)}
    />
    
    {/* Session Timeout Warning */}
    <SessionTimeoutWarning
      visible={sessionTimeoutWarning}
      onExtendSession={handleExtendSession}
      onLogout={handleLogout}
      timeoutSeconds={120}
    />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AssetProvider>
          <AppContent />
        </AssetProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}