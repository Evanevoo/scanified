import logger from '../utils/logger';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

// Note: expo-camera v17+ removed Camera.setFlashlightAsync. Flashlight is only available
// via the enableTorch prop on CameraView when the camera is open.

/**
 * Field Tools Service - Provides GPS tagging, flashlight control, and route optimization
 * Designed for field workers who need location tracking and navigation assistance
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  address?: string;
}

export interface RoutePoint {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  estimatedTime?: number; // minutes
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scansCompleted?: number;
  notes?: string;
}

export interface RouteOptimization {
  optimizedOrder: RoutePoint[];
  totalDistance: number; // in kilometers
  estimatedTime: number; // in minutes
  fuelSavings: number; // percentage
}

class FieldToolsService {
  private isLocationEnabled = false;
  private isFlashlightOn = false;
  private currentLocation: LocationData | null = null;
  private locationWatcher: Location.LocationSubscription | null = null;
  private isInitialized = false;

  /**
   * Initialize the field tools service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.initializeLocation();
      this.isInitialized = true;
      logger.log('🛰️ FieldToolsService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize FieldToolsService:', error);
    }
  }

  /**
   * Initialize location services
   */
  private async initializeLocation() {
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to use GPS features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'GPS tagging and route optimization require location access.',
          [{ text: 'OK' }]
        );
        return;
      }

      this.isLocationEnabled = true;

      // Get initial location
      await this.getCurrentLocation();
      
      logger.log('📍 Location services initialized');
    } catch (error) {
      logger.error('Error initializing location:', error);
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.isLocationEnabled) {
      await this.initializeLocation();
      if (!this.isLocationEnabled) return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // 10 seconds
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      // Try to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (addresses.length > 0) {
          const addr = addresses[0];
          locationData.address = [
            addr.streetNumber,
            addr.street,
            addr.city,
            addr.region,
            addr.postalCode,
          ]
            .filter(Boolean)
            .join(', ');
        }
      } catch (error) {
        logger.warn('Could not get address for location:', error);
      }

      this.currentLocation = locationData;
      return locationData;
    } catch (error) {
      logger.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start watching location changes
   */
  async startLocationTracking(callback: (location: LocationData) => void) {
    if (!this.isLocationEnabled) {
      await this.initializeLocation();
      if (!this.isLocationEnabled) return;
    }

    try {
      this.locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          this.currentLocation = locationData;
          callback(locationData);
        }
      );

      logger.log('📍 Location tracking started');
    } catch (error) {
      logger.error('Error starting location tracking:', error);
    }
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking() {
    if (this.locationWatcher) {
      this.locationWatcher.remove();
      this.locationWatcher = null;
      logger.log('📍 Location tracking stopped');
    }
  }

  /**
   * Toggle flashlight
   */
  async toggleFlashlight(): Promise<boolean> {
    try {
      // expo-camera v17+ removed Camera.setFlashlightAsync - flashlight is only available
      // via enableTorch on CameraView when the camera is open
      const camera = require('expo-camera');
      const setFlashlight = (camera as any).setFlashlightAsync ?? (camera as any).Camera?.setFlashlightAsync;
      if (typeof setFlashlight !== 'function') {
        logger.warn('Flashlight API not available - use torch on camera when scanning');
        Alert.alert('Flashlight', 'Flashlight is available when the camera scanner is open. Open the scanner and use the torch button.');
        return this.isFlashlightOn;
      }
      if (this.isFlashlightOn) {
        await setFlashlight(false);
        this.isFlashlightOn = false;
        logger.log('🔦 Flashlight turned OFF');
      } else {
        await setFlashlight(true);
        this.isFlashlightOn = true;
        logger.log('🔦 Flashlight turned ON');
      }
      return this.isFlashlightOn;
    } catch (error) {
      logger.error('Error toggling flashlight:', error);
      Alert.alert('Flashlight', 'Flashlight is available when the camera scanner is open.');
      return this.isFlashlightOn;
    }
  }

  /**
   * Get flashlight status
   */
  isFlashlightEnabled(): boolean {
    return this.isFlashlightOn;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Optimize route using nearest neighbor algorithm
   */
  async optimizeRoute(
    startLocation: { latitude: number; longitude: number },
    destinations: RoutePoint[]
  ): Promise<RouteOptimization> {
    if (destinations.length === 0) {
      return {
        optimizedOrder: [],
        totalDistance: 0,
        estimatedTime: 0,
        fuelSavings: 0,
      };
    }

    // Simple nearest neighbor algorithm
    const unvisited = [...destinations];
    const optimized: RoutePoint[] = [];
    let currentLocation = startLocation;
    let totalDistance = 0;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        unvisited[0].coordinates.latitude,
        unvisited[0].coordinates.longitude
      );

      // Find nearest unvisited destination
      for (let i = 1; i < unvisited.length; i++) {
        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          unvisited[i].coordinates.latitude,
          unvisited[i].coordinates.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Add nearest destination to optimized route
      const nearest = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      totalDistance += nearestDistance;
      currentLocation = nearest.coordinates;
    }

    // Calculate original route distance for comparison
    let originalDistance = 0;
    let currentPos = startLocation;
    for (const destination of destinations) {
      const distance = this.calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        destination.coordinates.latitude,
        destination.coordinates.longitude
      );
      originalDistance += distance;
      currentPos = destination.coordinates;
    }

    const fuelSavings = originalDistance > 0 
      ? Math.max(0, ((originalDistance - totalDistance) / originalDistance) * 100)
      : 0;

    // Estimate time (assuming 40 km/h average speed + 15 minutes per stop)
    const estimatedTime = Math.round((totalDistance / 40) * 60 + destinations.length * 15);

    return {
      optimizedOrder: optimized,
      totalDistance: Math.round(totalDistance * 100) / 100,
      estimatedTime,
      fuelSavings: Math.round(fuelSavings * 10) / 10,
    };
  }

  /**
   * Open navigation app with route
   */
  async openNavigation(destination: RoutePoint) {
    const { latitude, longitude } = destination.coordinates;
    const label = encodeURIComponent(destination.name);

    // Try different navigation apps
    const navigationOptions = [
      {
        name: 'Google Maps',
        url: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_label=${label}`,
        scheme: `google.navigation:q=${latitude},${longitude}`,
      },
      {
        name: 'Apple Maps',
        url: `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`,
        scheme: `maps://?daddr=${latitude},${longitude}&q=${label}`,
      },
      {
        name: 'Waze',
        url: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
        scheme: `waze://?ll=${latitude},${longitude}&navigate=yes`,
      },
    ];

    for (const option of navigationOptions) {
      try {
        const supported = await Linking.canOpenURL(option.scheme);
        if (supported) {
          await Linking.openURL(option.scheme);
          logger.log(`🗺️ Opened ${option.name} for navigation`);
          return;
        }
      } catch (error) {
        // Try next option
      }
    }

    // Fallback to web URL
    try {
      await Linking.openURL(navigationOptions[0].url);
      logger.log('🗺️ Opened web navigation');
    } catch (error) {
      logger.error('Error opening navigation:', error);
      Alert.alert('Navigation Error', 'Could not open navigation app.');
    }
  }

  /**
   * Get location accuracy description
   */
  getLocationAccuracyDescription(accuracy: number | null): string {
    if (!accuracy) return 'Unknown';
    
    if (accuracy <= 5) return 'Excellent (±5m)';
    if (accuracy <= 10) return 'Good (±10m)';
    if (accuracy <= 20) return 'Fair (±20m)';
    return `Poor (±${Math.round(accuracy)}m)`;
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  }

  /**
   * Get current location data
   */
  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * Check if location services are available
   */
  isLocationAvailable(): boolean {
    return this.isLocationEnabled;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopLocationTracking();
    
    if (this.isFlashlightOn) {
      try {
        const camera = require('expo-camera');
        const setFlashlight = (camera as any).setFlashlightAsync ?? (camera as any).Camera?.setFlashlightAsync;
        if (typeof setFlashlight === 'function') {
          setFlashlight(false).catch(console.error);
        }
      } catch (_) { /* API not available */ }
      this.isFlashlightOn = false;
    }
    
    this.isInitialized = false;
    logger.log('🛰️ FieldToolsService cleaned up');
  }
}

// Export singleton instance
export const fieldToolsService = new FieldToolsService();
export default fieldToolsService;
