import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';

// Import screens
import LoginScreen from './LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ScanCylindersScreen from './screens/ScanCylindersScreen';
import ScanCylindersActionScreen from './screens/ScanCylindersActionScreen';
import AddCylinderScreen from './screens/AddCylinderScreen';
import EditCylinderScreen from './screens/EditCylinderScreen';
import FillCylinderScreen from './screens/FillCylinderScreen';
import LocateCylinderScreen from './screens/LocateCylinderScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';
import HistoryScreen from './screens/HistoryScreen';
import RecentScansScreen from './screens/RecentScansScreen';
import SettingsScreen from './screens/SettingsScreen';
import UserManagementScreen from './screens/UserManagementScreen';

// Import contexts
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';

// Import components
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

// Import auth hook
import { useAuth } from './hooks/useAuth';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while initializing or checking auth
  if (isInitializing || loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "Home" : "Login"}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          // Auth screens
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ 
              title: 'LessAnnoyingScan',
              headerShown: false 
            }}
          />
        ) : (
          // App screens (only shown when authenticated)
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ title: 'LessAnnoyingScan' }}
            />
            <Stack.Screen 
              name="ScanCylinders" 
              component={ScanCylindersScreen} 
              options={{ title: 'Scan Cylinders' }}
            />
            <Stack.Screen 
              name="ScanCylindersAction" 
              component={ScanCylindersActionScreen} 
              options={{ title: 'Cylinder Actions' }}
            />
            <Stack.Screen 
              name="AddCylinder" 
              component={AddCylinderScreen} 
              options={{ title: 'Add Cylinder' }}
            />
            <Stack.Screen 
              name="EditCylinder" 
              component={EditCylinderScreen} 
              options={{ title: 'Edit Cylinder' }}
            />
            <Stack.Screen 
              name="FillCylinder" 
              component={FillCylinderScreen} 
              options={{ title: 'Fill Cylinder' }}
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
              options={{ title: 'History' }}
            />
            <Stack.Screen 
              name="RecentScans" 
              component={RecentScansScreen} 
              options={{ title: 'Recent Scans' }}
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
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="auto" />
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

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
  },
});
