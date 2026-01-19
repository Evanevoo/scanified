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
import LocateCylinderScreen from './screens/LocateCylinderScreen';
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
import DataHealthScreen from './screens/DataHealthScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';

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

  // Show update modal when update is available
  React.useEffect(() => {
    if (updateInfo?.hasUpdate) {
      setShowUpdateModal(true);
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

  // Initialize services when user is authenticated
  React.useEffect(() => {
    if (user && profile?.organization_id) {
      // Initialize notification service
      notificationService.initialize().then(() => {
        notificationService.registerDevice(user.id, profile.organization_id);
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
              options={{ title: 'Scan Cylinders' }}
            />
            <Stack.Screen 
              name="EnhancedScan" 
              component={EnhancedScanScreen}
              options={{ title: 'Enhanced Scan' }}
            />
            <Stack.Screen 
              name="EditCylinder" 
              component={EditCylinderScreen}
              options={{ title: 'Edit Cylinder' }}
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
              name="LocateCylinder" 
              component={LocateCylinderScreen}
              options={{ title: 'Locate Cylinder' }}
            />
            <Stack.Screen 
              name="FillCylinder" 
              component={FillCylinderScreen}
              options={{ title: 'Fill Cylinder' }}
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
              name="DataHealth" 
              component={DataHealthScreen}
              options={{ title: 'Data Health' }}
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