import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';

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
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AssetProvider, useAssetConfig } from './context/AssetContext';

// Import components
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

// Import auth hook
import { useAuth } from './hooks/useAuth';
import { supabase } from './supabase';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, organization, loading } = useAuth();
  const { config: assetConfig, loading: assetLoading } = useAssetConfig();
  const [isInitializing, setIsInitializing] = useState(true);
  const [checkingOrg, setCheckingOrg] = useState(false);
  const { theme } = useTheme();

  // Provide default theme if undefined
  const safeTheme = theme || {
    primary: '#2563eb',
    background: '#ffffff',
    statusBar: 'dark-content' as const,
  };

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Enforce subscription/trial expiry
  useEffect(() => {
    if (!user || !organization) return;
    if (checkingOrg) return;
    setCheckingOrg(true);
    const now = new Date();
    let expired = false;
    if (organization.subscription_status === 'expired' || organization.subscription_status === 'cancelled') {
      expired = true;
    }
    if (organization.trial_ends_at && new Date(organization.trial_ends_at) < now) {
      expired = true;
    }
    if (!organization.is_active) {
      expired = true;
    }
    if (expired) {
      Alert.alert(
        'Subscription Expired',
        'Your organization\'s subscription or trial has expired. Please contact support.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await supabase.auth.signOut();
              setCheckingOrg(false);
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      setCheckingOrg(false);
    }
  }, [user, organization]);

  // Show loading screen while initializing or checking auth
  if (isInitializing || loading || checkingOrg || assetLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={safeTheme.statusBar as any} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={user ? "Home" : "Login"}
          screenOptions={{
            headerStyle: {
              backgroundColor: safeTheme.primary,
              borderBottomWidth: 0,
            } as any,
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 18,
            },
            headerBackTitleVisible: false,
            gestureEnabled: true,
            cardStyle: {
              backgroundColor: safeTheme.background,
            },
            cardStyleInterpolator: ({ current, layouts }: any) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        >
          {!user ? (
            // Auth screens
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ 
                title: assetConfig.appName,
                headerShown: false 
              }}
            />
          ) : (
            // App screens (only shown when authenticated)
            <>
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ 
                  title: 'Dashboard',
                  headerStyle: {
                    backgroundColor: safeTheme.primary,
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                  } as any,
                }}
              />
              <Stack.Screen 
                name="ScanCylinders" 
                component={ScanCylindersScreen} 
                options={{ title: `Scan ${assetConfig.assetDisplayNamePlural}` }}
              />
              <Stack.Screen 
                name="ScanCylindersAction" 
                component={ScanCylindersActionScreen} 
                options={{ title: `${assetConfig.assetDisplayName} Actions` }}
              />
              <Stack.Screen 
                name="AddCylinder" 
                component={AddCylinderScreen} 
                options={{ title: `Add ${assetConfig.assetDisplayName}` }}
              />
              <Stack.Screen 
                name="EditCylinder" 
                component={EditCylinderScreen} 
                options={{ title: `Edit ${assetConfig.assetDisplayName}` }}
              />
              <Stack.Screen 
                name="FillCylinder" 
                component={FillCylinderScreen} 
                options={{ title: 'Update Status' }}
              />
              <Stack.Screen 
                name="LocateCylinder" 
                component={LocateCylinderScreen} 
                options={{ title: `Locate ${assetConfig.assetDisplayName}` }}
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
      </NavigationContainer>
    </>
  );
}

// AuthGate component to delay children until user is authenticated
function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ErrorBoundary>
          <AuthGate>
            <AssetProvider>
              <AppContent />
            </AssetProvider>
          </AuthGate>
        </ErrorBoundary>
      </SettingsProvider>
    </ThemeProvider>
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
