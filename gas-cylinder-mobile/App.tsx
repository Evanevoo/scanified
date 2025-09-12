import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AssetProvider } from './context/AssetContext';
import { useAuth } from './hooks/useAuth';

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
  const { user, profile, organization, loading } = useAuth();
  
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