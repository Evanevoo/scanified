import React from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AssetProvider } from './context/AssetContext';
import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/LoadingScreen';

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
import { notificationService } from './services/NotificationService';
import { soundService } from './services/soundService';

// Silence known, harmless development warnings in Expo Go
if (__DEV__) {
  LogBox.ignoreLogs([
    // Expo Go limitations - these are informational, not errors
    'expo-notifications: Android Push notifications',
    '`expo-notifications` functionality is not fully supported',
    'Expo AV has been deprecated',
    'SafeAreaView has been deprecated',
    // Sound placeholders during development
    'Sound Scan Success configured but not preloaded',
    'Sound Scan Error configured but not preloaded',
    'Sound Notification configured but not preloaded',
    'Sound Action configured but not preloaded',
    // Common development messages
    'Profile loaded successfully',
    'Organization loaded successfully',
    'Screen focused, refreshing stats',
    'Running in Expo Go - skipping remote push setup',
    'Local notifications still work',
    'No push token available',
    'Sounds preloaded successfully',
    'SoundService initialized',
    'Loading settings',
    'Preloading sounds',
    'Sound preloading completed',
    'CustomizationService initialized'
  ]);
}

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
  const { user, profile, organization, loading, organizationLoading, authError } = useAuth();

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
    <NavigationContainer>
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