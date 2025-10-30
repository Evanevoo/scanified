import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { fieldToolsService, LocationData, RoutePoint } from '../services/fieldToolsService';
import { feedbackService } from '../services/feedbackService';
import { useTheme } from '../context/ThemeContext';
import StatusIndicator from './StatusIndicator';

const { width } = Dimensions.get('window');

interface FieldToolsPanelProps {
  visible: boolean;
  onClose: () => void;
  currentScanLocation?: string;
  onLocationTagged?: (location: LocationData) => void;
}

export default function FieldToolsPanel({
  visible,
  onClose,
  currentScanLocation,
  onLocationTagged,
}: FieldToolsPanelProps) {
  const { theme } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<string>('Unknown');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Sample route points for demonstration
  const [routePoints] = useState<RoutePoint[]>([
    {
      id: '1',
      name: 'Warehouse A',
      address: '123 Industrial Ave, Saskatoon, SK',
      coordinates: { latitude: 52.1332, longitude: -106.6700 },
      status: 'pending',
      scansCompleted: 0,
    },
    {
      id: '2',
      name: 'Customer Site B',
      address: '456 Main St, Regina, SK',
      coordinates: { latitude: 50.4452, longitude: -104.6189 },
      status: 'pending',
      scansCompleted: 0,
    },
    {
      id: '3',
      name: 'Distribution Center',
      address: '789 Commerce Blvd, Calgary, AB',
      coordinates: { latitude: 51.0447, longitude: -114.0719 },
      status: 'pending',
      scansCompleted: 0,
    },
  ]);

  useEffect(() => {
    if (visible) {
      initializeFieldTools();
    }

    return () => {
      if (isLocationTracking) {
        fieldToolsService.stopLocationTracking();
      }
    };
  }, [visible]);

  const initializeFieldTools = async () => {
    await fieldToolsService.initialize();
    setIsFlashlightOn(fieldToolsService.isFlashlightEnabled());
    
    // Get initial location
    await refreshLocation();
  };

  const refreshLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await fieldToolsService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        setLocationAccuracy(fieldToolsService.getLocationAccuracyDescription(location.accuracy));
        
        if (onLocationTagged) {
          onLocationTagged(location);
        }
      }
    } catch (error) {
      logger.error('Error refreshing location:', error);
      Alert.alert('Location Error', 'Could not get current location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const toggleFlashlight = async () => {
    try {
      const newState = await fieldToolsService.toggleFlashlight();
      setIsFlashlightOn(newState);
      await feedbackService.quickAction(newState ? 'flashlight on' : 'flashlight off');
    } catch (error) {
      logger.error('Error toggling flashlight:', error);
    }
  };

  const toggleLocationTracking = async () => {
    if (isLocationTracking) {
      fieldToolsService.stopLocationTracking();
      setIsLocationTracking(false);
      await feedbackService.quickAction('location tracking stopped');
    } else {
      await fieldToolsService.startLocationTracking((location) => {
        setCurrentLocation(location);
        setLocationAccuracy(fieldToolsService.getLocationAccuracyDescription(location.accuracy));
      });
      setIsLocationTracking(true);
      await feedbackService.quickAction('location tracking started');
    }
  };

  const optimizeRoute = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please get your current location first.');
      return;
    }

    try {
      const optimization = await fieldToolsService.optimizeRoute(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        routePoints
      );

      Alert.alert(
        'Route Optimized! 🎯',
        `Optimized route will save ${optimization.fuelSavings.toFixed(1)}% fuel\n` +
        `Total distance: ${optimization.totalDistance} km\n` +
        `Estimated time: ${Math.round(optimization.estimatedTime / 60)}h ${optimization.estimatedTime % 60}m`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Navigation', onPress: () => startNavigation(optimization.optimizedOrder[0]) },
        ]
      );

      await feedbackService.quickAction('route optimized');
    } catch (error) {
      logger.error('Error optimizing route:', error);
      Alert.alert('Optimization Error', 'Could not optimize route.');
    }
  };

  const startNavigation = async (destination: RoutePoint) => {
    try {
      await fieldToolsService.openNavigation(destination);
      await feedbackService.quickAction('navigation started');
    } catch (error) {
      logger.error('Error starting navigation:', error);
    }
  };

  const tagCurrentLocation = async () => {
    await refreshLocation();
    if (currentLocation) {
      Alert.alert(
        'Location Tagged! 📍',
        `Location: ${fieldToolsService.formatCoordinates(currentLocation.latitude, currentLocation.longitude)}\n` +
        `Accuracy: ${locationAccuracy}\n` +
        (currentLocation.address ? `Address: ${currentLocation.address}` : ''),
        [{ text: 'OK' }]
      );
      
      await feedbackService.quickAction('location tagged');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>🛰️ Field Tools</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Current Location Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📍 Current Location</Text>
          
          {currentLocation ? (
            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>Coordinates:</Text>
                <Text style={[styles.locationValue, { color: theme.text }]}>
                  {fieldToolsService.formatCoordinates(currentLocation.latitude, currentLocation.longitude)}
                </Text>
              </View>
              
              <View style={styles.locationRow}>
                <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>Accuracy:</Text>
                <StatusIndicator
                  status={currentLocation.accuracy && currentLocation.accuracy <= 10 ? 'success' : 'warning'}
                  text={locationAccuracy}
                  size="small"
                  variant="badge"
                />
              </View>
              
              {currentLocation.address && (
                <View style={styles.locationRow}>
                  <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>Address:</Text>
                  <Text style={[styles.locationValue, { color: theme.text }]} numberOfLines={2}>
                    {currentLocation.address}
                  </Text>
                </View>
              )}
              
              {currentLocation.speed && currentLocation.speed > 0 && (
                <View style={styles.locationRow}>
                  <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>Speed:</Text>
                  <Text style={[styles.locationValue, { color: theme.text }]}>
                    {Math.round(currentLocation.speed * 3.6)} km/h
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.noLocationText, { color: theme.textSecondary }]}>
              No location data available
            </Text>
          )}

          <View style={styles.locationActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={refreshLocation}
              disabled={isLoadingLocation}
            >
              <Text style={styles.actionButtonText}>
                {isLoadingLocation ? '📍 Getting Location...' : '📍 Refresh Location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isLocationTracking ? theme.error : theme.success }
              ]}
              onPress={toggleLocationTracking}
            >
              <Text style={styles.actionButtonText}>
                {isLocationTracking ? '⏹️ Stop Tracking' : '▶️ Start Tracking'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.tagButton, { backgroundColor: theme.info }]}
            onPress={tagCurrentLocation}
            disabled={!currentLocation}
          >
            <Text style={styles.actionButtonText}>🏷️ Tag Current Location</Text>
          </TouchableOpacity>
        </View>

        {/* Flashlight Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🔦 Flashlight</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Use your device's flashlight for scanning in dark environments
          </Text>

          <TouchableOpacity
            style={[
              styles.flashlightButton,
              { backgroundColor: isFlashlightOn ? theme.warning : theme.border }
            ]}
            onPress={toggleFlashlight}
          >
            <Text style={[
              styles.flashlightButtonText,
              { color: isFlashlightOn ? '#fff' : theme.text }
            ]}>
              {isFlashlightOn ? '🔦 Turn OFF Flashlight' : '🔦 Turn ON Flashlight'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Route Optimization Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🗺️ Route Optimization</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Optimize your route to save time and fuel
          </Text>

          <View style={styles.routeList}>
            {routePoints.map((point, index) => (
              <View key={point.id} style={[styles.routeItem, { borderColor: theme.border }]}>
                <View style={styles.routeItemHeader}>
                  <Text style={[styles.routeItemName, { color: theme.text }]}>
                    {index + 1}. {point.name}
                  </Text>
                  <StatusIndicator
                    status={point.status}
                    size="small"
                    variant="dot"
                  />
                </View>
                <Text style={[styles.routeItemAddress, { color: theme.textSecondary }]}>
                  {point.address}
                </Text>
                
                <TouchableOpacity
                  style={[styles.navigateButton, { backgroundColor: theme.primary }]}
                  onPress={() => startNavigation(point)}
                >
                  <Text style={styles.navigateButtonText}>🧭 Navigate</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.optimizeButton, { backgroundColor: theme.success }]}
            onPress={optimizeRoute}
            disabled={!currentLocation}
          >
            <Text style={styles.actionButtonText}>⚡ Optimize Route</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Quick Actions</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.info }]}
              onPress={() => {
                Alert.alert('GPS Info', 'GPS accuracy depends on satellite visibility and weather conditions. For best results, use outdoors with clear sky view.');
              }}
            >
              <Text style={styles.quickActionText}>ℹ️ GPS Tips</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.secondary }]}
              onPress={() => {
                Alert.alert('Field Tools Help', 'Use these tools to enhance your field work:\n\n📍 Location: Tag scan locations\n🔦 Flashlight: Illuminate dark areas\n🗺️ Routes: Optimize travel paths');
              }}
            >
              <Text style={styles.quickActionText}>❓ Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  locationInfo: {
    marginBottom: 16,
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  locationValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  noLocationText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tagButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  flashlightButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flashlightButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeList: {
    marginBottom: 16,
    gap: 12,
  },
  routeItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  routeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeItemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  routeItemAddress: {
    fontSize: 12,
    marginBottom: 8,
  },
  navigateButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  optimizeButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
