import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ScanCylindersScreen from './screens/ScanCylindersScreen';
import ScanCylindersActionScreen from './screens/ScanCylindersActionScreen';
import EditCylinderScreen from './screens/EditCylinderScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecentScansScreen from './screens/RecentScansScreen';
import AddCylinderScreen from './screens/AddCylinderScreen';
import LocateCylinderScreen from './screens/LocateCylinderScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';
import HistoryScreen from './screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ScanCylinders" component={ScanCylindersScreen} options={{ title: 'Scan Cylinders' }} />
        <Stack.Screen name="ScanCylindersAction" component={ScanCylindersActionScreen} options={{ title: 'Scan/Enter Cylinders' }} />
        <Stack.Screen name="EditCylinder" component={EditCylinderScreen} options={{ title: 'Edit Cylinder' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="RecentScans" component={RecentScansScreen} options={{ title: 'Recent Synced Scans' }} />
        <Stack.Screen name="AddCylinder" component={AddCylinderScreen} options={{ title: 'Add Cylinder' }} />
        <Stack.Screen name="LocateCylinder" component={LocateCylinderScreen} options={{ title: 'Locate Cylinder' }} />
        <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} options={{ title: 'Customer Details' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Scan History' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
