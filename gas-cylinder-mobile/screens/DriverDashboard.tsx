import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Dimensions
} from 'react-native';
import {
  MaterialIcons, MaterialCommunityIcons, Ionicons,
  FontAwesome5, Entypo
} from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { deliveryService } from '../services/deliveryService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

export default function DriverDashboard() {
  const { profile, organization } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    if (profile?.id) {
      fetchDeliveries();
      getCurrentLocation();
    }
  }, [profile]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDriverDeliveries(profile.id);
      setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      Alert.alert('Error', 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Update location in database
      await updateDriverLocation(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const updateDriverLocation = async (latitude, longitude) => {
    try {
      await supabase
        .from('driver_locations')
        .upsert({
          driver_id: profile.id,
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      await deliveryService.updateDeliveryStatus(deliveryId, status);
      
      // Send notification to customer
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        await notificationService.sendDeliveryNotification(delivery, organization);
      }

      fetchDeliveries();
      Alert.alert('Success', `Delivery status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    }
  };

  const confirmDelivery = async (deliveryId) => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you want to mark this delivery as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateDeliveryStatus(deliveryId, 'delivered') }
      ]
    );
  };

  const startDelivery = async (deliveryId) => {
    Alert.alert(
      'Start Delivery',
      'Are you ready to start this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => updateDeliveryStatus(deliveryId, 'in_transit') }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#2196F3';
      case 'in_transit':
        return '#FF9800';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <MaterialIcons name="schedule" size={20} color="#2196F3" />;
      case 'in_transit':
        return <MaterialCommunityIcons name="truck-delivery" size={20} color="#FF9800" />;
      case 'delivered':
        return <MaterialIcons name="check-circle" size={20} color="#4CAF50" />;
      case 'cancelled':
        return <MaterialIcons name="cancel" size={20} color="#F44336" />;
      default:
        return <MaterialIcons name="schedule" size={20} color="#757575" />;
    }
  };

  const stats = {
    total: deliveries.length,
    scheduled: deliveries.filter(d => d.status === 'scheduled').length,
    inTransit: deliveries.filter(d => d.status === 'in_transit').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length
  };

  const renderDeliveryCard = (delivery) => (
    <View key={delivery.id} style={styles.deliveryCard}>
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryId}>#{delivery.id}</Text>
          <Text style={styles.customerName}>{delivery.customer?.name}</Text>
          <Text style={styles.customerPhone}>{delivery.customer?.phone}</Text>
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(delivery.status)}
          <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
            {delivery.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.deliveryDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.detailText}>
            {new Date(delivery.delivery_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="access-time" size={16} color="#666" />
          <Text style={styles.detailText}>
            {delivery.delivery_time || 'Flexible'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.detailText}>
            {delivery.customer?.address || 'Address not available'}
          </Text>
        </View>
        {delivery.notes && (
          <View style={styles.detailRow}>
            <MaterialIcons name="note" size={16} color="#666" />
            <Text style={styles.detailText}>{delivery.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        {delivery.status === 'scheduled' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={() => startDelivery(delivery.id)}
          >
            <MaterialCommunityIcons name="play" size={16} color="white" />
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        )}
        
        {delivery.status === 'in_transit' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => confirmDelivery(delivery.id)}
          >
            <MaterialIcons name="check" size={16} color="white" />
            <Text style={styles.buttonText}>Complete</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.mapButton}>
          <MaterialIcons name="map" size={16} color="#2196F3" />
          <Text style={[styles.buttonText, { color: '#2196F3' }]}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.callButton}>
          <MaterialIcons name="phone" size={16} color="#4CAF50" />
          <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Driver Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {profile?.full_name}</Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.scheduled}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.inTransit}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      {/* Current Location */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <MaterialIcons name="my-location" size={20} color="#2196F3" />
          <Text style={styles.locationTitle}>Current Location</Text>
        </View>
        {currentLocation ? (
          <Text style={styles.locationText}>
            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.locationText}>Getting location...</Text>
        )}
        <TouchableOpacity style={styles.updateLocationButton} onPress={getCurrentLocation}>
          <MaterialIcons name="refresh" size={16} color="white" />
          <Text style={styles.buttonText}>Update Location</Text>
        </TouchableOpacity>
      </View>

      {/* Deliveries */}
      <View style={styles.deliveriesSection}>
        <Text style={styles.sectionTitle}>Today's Deliveries</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading deliveries...</Text>
          </View>
        ) : deliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No deliveries scheduled</Text>
          </View>
        ) : (
          deliveries.map(renderDeliveryCard)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  updateLocationButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 6,
  },
  deliveriesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  deliveryCard: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  deliveryDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#FF9800',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2196F3',
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
}); 