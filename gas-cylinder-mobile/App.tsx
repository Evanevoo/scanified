import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './hooks/useAuth';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncService } from './services/SyncService';
import StatusBar from './components/StatusBar';
import HomeScreen from './screens/HomeScreen';
import ScanCylindersScreen from './screens/ScanCylindersScreen';
import ScanCylindersActionScreen from './screens/ScanCylindersActionScreen';
import EditCylinderScreen from './screens/EditCylinderScreen';
import SettingsScreen from './screens/SettingsScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import RecentScansScreen from './screens/RecentScansScreen';
import AddCylinderScreen from './screens/AddCylinderScreen';
import LocateCylinderScreen from './screens/LocateCylinderScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';
import HistoryScreen from './screens/HistoryScreen';
import FillCylinderScreen from './screens/FillCylinderScreen';
import LoginScreen from './LoginScreen';
import LoadingScreen from './components/LoadingScreen';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  // Initialize connectivity monitoring when app starts
  React.useEffect(() => {
    SyncService.initializeConnectivityMonitoring();
    
    // Cleanup on unmount
    return () => {
      SyncService.cleanupConnectivityMonitoring();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.surface,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: colors.surface,
          },
          headerShadowVisible: false,
        }}
      >
        {user ? (
          // Authenticated user - show main app screens
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                title: 'Gas Cylinder App',
                headerRight: () => null,
              }}
            />
            <Stack.Screen 
              name="ScanCylinders" 
              component={ScanCylindersScreen} 
              options={{ title: 'Scan Cylinders' }} 
            />
            <Stack.Screen 
              name="ScanCylindersAction" 
              component={ScanCylindersActionScreen} 
              options={{ title: 'Scan/Enter Cylinders' }} 
            />
            <Stack.Screen 
              name="EditCylinder" 
              component={EditCylinderScreen} 
              options={{ title: 'Edit Cylinder' }} 
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ title: 'Settings' }} 
            />
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagementScreen} 
              options={{ title: 'User Management' }} 
            />
            <Stack.Screen 
              name="RecentScans" 
              component={RecentScansScreen} 
              options={{ title: 'Recent Synced Scans' }} 
            />
            <Stack.Screen 
              name="AddCylinder" 
              component={AddCylinderScreen} 
              options={{ title: 'Add Cylinder' }} 
            />
            <Stack.Screen 
              name="LocateCylinder" 
              component={LocateCylinderScreen} 
              options={{ title: 'Locate Cylinder' }} 
            />
            <Stack.Screen 
              name="CustomerDetails" 
              component={CustomerDetailsScreen} 
              options={{ title: 'Customer Details' }} 
            />
            <Stack.Screen 
              name="History" 
              component={HistoryScreen} 
              options={{ title: 'Scan History' }} 
            />
            <Stack.Screen 
              name="FillCylinder" 
              component={FillCylinderScreen} 
              options={{ title: 'Update Cylinder Status' }} 
            />
          </>
        ) : (
          // Not authenticated - show login screen
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ 
              title: 'Login',
              headerShown: false 
            }} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
