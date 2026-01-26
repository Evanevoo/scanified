import React from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AssetProvider } from './context/AssetContext';
import { useAuth } from './hooks/useAuth';
import { notificationService } from './services/NotificationService';
import { soundService } from './services/soundService';
import { useAppUpdate } from './hooks/useAppUpdate';
import UpdateModal from './components/UpdateModal';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import logger from './utils/logger';

// Silence known, harmless development warnings - MUST BE BEFORE OTHER IMPORTS USE THEM
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
import CustomizationScreen from './screens/CustomizationScreen';
import OrganizationJoinScreen from './screens/OrganizationJoinScreen';
import HistoryScreen from './screens/HistoryScreen';
import RecentScansScreen from './screens/RecentScansScreen';
import SupportTicketScreen from './screens/SupportTicketScreen';
import ScanbotTestScreen from './screens/ScanbotTestScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import DriverDashboard from './screens/DriverDashboard';
import AnalyticsScreen from './screens/AnalyticsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
// Enhanced Scanner Test Screens
import EnhancedScannerTestScreen from './screens/EnhancedScannerTestScreen';
import TestSingleScanScreen from './screens/TestSingleScanScreen';
import TestBatchScanScreen from './screens/TestBatchScanScreen';
import TestConcurrentScanScreen from './screens/TestConcurrentScanScreen';
import TestPerformanceScreen from './screens/TestPerformanceScreen';
import ScannerSettingsScreen from './screens/ScannerSettingsScreen';

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
  const [organizationLoadTimeout, setOrganizationLoadTimeout] = React.useState(false);

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

  // Add timeout safeguard for organization loading
  React.useEffect(() => {
    if (organizationLoading && user) {
      const timeout = setTimeout(() => {
        logger.warn('⚠️ Organization loading exceeded 25 seconds - showing timeout state');
        setOrganizationLoadTimeout(true);
      }, 25000); // 25 second timeout (slightly longer than useAuth's 20s)
      
      return () => {
        clearTimeout(timeout);
        setOrganizationLoadTimeout(false);
      };
    } else {
      setOrganizationLoadTimeout(false);
    }
  }, [organizationLoading, user]);

  // Handle session timeout warning actions
  const handleExtendSession = React.useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  const handleLogout = React.useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Track navigation activity to prevent session timeout during active use
  // MUST be defined before any early returns to follow Rules of Hooks
  // Use ref pattern to avoid dependency on updateActivity which changes frequently
  const updateActivityRef = React.useRef(updateActivity);
  React.useEffect(() => {
    updateActivityRef.current = updateActivity;
  }, [updateActivity]);

  const handleNavigationStateChange = React.useCallback(() => {
    try {
      // User navigated - update activity to prevent timeout
      if (user) {
        updateActivityRef.current();
      }
    } catch (error) {
      // Silently handle errors in activity tracking - don't crash app
      logger.warn('Error updating activity on navigation:', error);
    }
  }, [user]); // Removed updateActivity from dependencies to prevent infinite loop

  // Initialize services when user is authenticated
  React.useEffect(() => {
    if (user && profile?.organization_id) {
      // Initialize notification service (gracefully handle Expo Go limitations)
      notificationService.initialize().then(() => {
        notificationService.registerDevice(user.id, profile.organization_id);
      }).catch((error) => {
        // Suppress Expo Go SDK 53+ warning about remote push notifications
        if (error?.message?.includes('removed from Expo Go') || 
            error?.message?.includes('development build')) {
          // This is expected in Expo Go - local notifications still work
          logger.log('📱 Notification service: Remote push not available in Expo Go (expected)');
        } else {
          logger.error('Error initializing notification service:', error);
        }
      });
      
      // Initialize sound service
      soundService.initialize();
    }
  }, [user, profile]);
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>🔄 Loading...</Text>
          <Text style={styles.text}>Please wait while we load your data.</Text>
        </View>
      </SafeAreaView>
    );
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
  if (user && organizationLoading && !organizationLoadTimeout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>🔄 Loading...</Text>
          <Text style={styles.text}>Loading your organization data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show timeout error if organization loading took too long
  if (user && organizationLoadTimeout && !organization) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>⚠️ Loading Timeout</Text>
          <Text style={styles.text}>
            Loading your organization data is taking longer than expected.
          </Text>
          <Text style={styles.subtext}>
            Please check your internet connection and try again. If the problem persists, contact support.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <NavigationContainer
        onStateChange={handleNavigationStateChange}
        key={user ? 'authenticated' : 'unauthenticated'}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: true, // Default to showing headers, but individual screens can override
          }}
          initialRouteName={user ? "Home" : "Login"}
        >
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
            <Stack.Screen 
              name="ScanbotTest" 
              component={ScanbotTestScreen}
              options={{ title: 'Scanbot SDK Test' }}
            />
            {/* Enhanced Scanner Test Screens */}
            <Stack.Screen 
              name="EnhancedScannerTest" 
              component={EnhancedScannerTestScreen}
              options={{ title: 'Enhanced Scanner Tests', headerShown: false }}
            />
            <Stack.Screen 
              name="TestSingleScan" 
              component={TestSingleScanScreen}
              options={{ title: 'Single Scan Test', headerShown: false }}
            />
            <Stack.Screen 
              name="TestBatchScan" 
              component={TestBatchScanScreen}
              options={{ title: 'Batch Scan Test', headerShown: false }}
            />
            <Stack.Screen 
              name="TestConcurrentScan" 
              component={TestConcurrentScanScreen}
              options={{ title: 'Concurrent Scan Test', headerShown: false }}
            />
            <Stack.Screen 
              name="TestImageProcessing" 
              component={TestSingleScanScreen}
              options={{ title: 'Image Processing Test', headerShown: false }}
            />
            <Stack.Screen 
              name="TestPerformance" 
              component={TestPerformanceScreen}
              options={{ title: 'Performance Monitor', headerShown: false }}
            />
            <Stack.Screen 
              name="TestScannerSettings" 
              component={ScannerSettingsScreen}
              options={{ title: 'Scanner Settings' }}
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