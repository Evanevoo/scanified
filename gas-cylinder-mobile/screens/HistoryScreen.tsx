import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTimeLocal } from '../utils/dateUtils';

function formatDate(dateStr: string) {
  return formatDateTimeLocal(dateStr);
}

interface GroupedOrder {
  order_number: string;
  scans: any[];
  customer_name: string;
  earliest_date: string;
  latest_date: string;
  isEditable: boolean;
}

interface BottleInfo {
  barcode: string;
  product_code?: string;
  description?: string;
  gas_type?: string;
  status?: string;
  location?: string;
}

export default function HistoryScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const [scans, setScans] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOrder, setEditOrder] = useState<GroupedOrder | null>(null);
  const [editCustomer, setEditCustomer] = useState('');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editBottles, setEditBottles] = useState<string[]>([]);
  const [bottleInfo, setBottleInfo] = useState<Map<string, BottleInfo>>(new Map());
  const [newBottleBarcode, setNewBottleBarcode] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch bottle information
  const fetchBottleInfo = async (barcodes: string[]) => {
    if (!profile?.organization_id || barcodes.length === 0) return;
    
    try {
      // Only select columns that exist in the bottles table
      // Note: size column does not exist in this database schema
      const { data, error } = await supabase
        .from('bottles')
        .select('barcode_number, product_code, description, gas_type, status, location')
        .eq('organization_id', profile.organization_id)
        .in('barcode_number', barcodes);
      
      if (error) {
        // If error mentions 'size', it might be cached code - try minimal query
        if (error.message?.includes('size')) {
          logger.warn('Size column error detected, trying minimal query...');
          const { data: minimalData, error: minimalError } = await supabase
            .from('bottles')
            .select('barcode_number, product_code, description')
            .eq('organization_id', profile.organization_id)
            .in('barcode_number', barcodes);
          
          if (minimalError) {
            logger.warn('Could not fetch bottle info (non-critical):', minimalError.message);
            return;
          }
          
          const infoMap = new Map<string, BottleInfo>();
          (minimalData || []).forEach(bottle => {
            infoMap.set(bottle.barcode_number, {
              barcode: bottle.barcode_number,
              product_code: bottle.product_code || undefined,
              description: bottle.description || undefined
            });
          });
          setBottleInfo(infoMap);
          return;
        }
        
        // Log error but don't crash - bottle info is optional
        logger.warn('Could not fetch bottle info (non-critical):', error.message);
        return;
      }
      
      const infoMap = new Map<string, BottleInfo>();
      (data || []).forEach(bottle => {
        infoMap.set(bottle.barcode_number, {
          barcode: bottle.barcode_number,
          product_code: bottle.product_code || undefined,
          description: bottle.description || undefined,
          gas_type: bottle.gas_type || undefined,
          status: bottle.status || undefined,
          location: bottle.location || undefined
        });
      });
      
      setBottleInfo(infoMap);
    } catch (err: any) {
      // Silently handle errors - bottle info is optional for display
      logger.warn('Error in fetchBottleInfo (non-critical):', err.message);
    }
  };

  // Group scans by order number (one scan per bottle per order - dedupe by bottle_barcode)
  const groupScansByOrder = (scans: any[]): GroupedOrder[] => {
    const orderMap = new Map<string, any[]>();
    
    // Group scans by order_number
    scans.forEach(scan => {
      const orderNum = scan.order_number || 'No Order Number';
      if (!orderMap.has(orderNum)) {
        orderMap.set(orderNum, []);
      }
      orderMap.get(orderNum)!.push(scan);
    });
    
    // Convert to array and calculate metadata; dedupe by bottle_barcode per order (keep latest)
    const grouped: GroupedOrder[] = [];
    orderMap.forEach((orderScans, orderNumber) => {
      const byBottle = new Map<string, any>();
      orderScans.forEach(s => {
        const barcode = s.bottle_barcode || '';
        if (!barcode) return;
        const existing = byBottle.get(barcode);
        if (!existing || new Date(s.created_at) > new Date(existing.created_at)) {
          byBottle.set(barcode, s);
        }
      });
      const dedupedScans = Array.from(byBottle.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const earliest = new Date(Math.min(...dedupedScans.map(s => new Date(s.created_at).getTime())));
      const latest = new Date(Math.max(...dedupedScans.map(s => new Date(s.created_at).getTime())));
      const hoursDiff = (new Date().getTime() - earliest.getTime()) / (1000 * 60 * 60);
      
      grouped.push({
        order_number: orderNumber,
        scans: dedupedScans,
        customer_name: orderScans[0].customer_name || 'Unknown Customer',
        earliest_date: earliest.toISOString(),
        latest_date: latest.toISOString(),
        isEditable: hoursDiff <= 24
      });
    });
    
    // Sort by latest scan date
    return grouped.sort((a, b) => 
      new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()
    );
  };

  useEffect(() => {
    const fetchScans = async () => {
      if (!profile?.organization_id) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Try bottle_scans table first
        let { data, error } = await supabase
          .from('bottle_scans')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .gte('created_at', since)
          .order('created_at', { ascending: false });
        
        // If bottle_scans doesn't exist, try cylinder_scans table
        if (error && error.message?.includes('relation') && error.message?.includes('does not exist')) {
          logger.log('bottle_scans table not found, trying cylinder_scans table...');
          const fallback = await supabase
            .from('cylinder_scans')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .gte('created_at', since)
            .order('created_at', { ascending: false });
          
          data = fallback.data;
          error = fallback.error;
        }
        
        if (error) {
          logger.error('Scan loading error:', error);
          setError(`Failed to load scans: ${error.message || 'Unknown error'}`);
        } else {
          setError('');
          setScans(data || []);
          const grouped = groupScansByOrder(data || []);
          setGroupedOrders(grouped);
          
          // Fetch bottle information for all scanned bottles
          const allBarcodes = data?.map(scan => scan.bottle_barcode).filter(Boolean) || [];
          if (allBarcodes.length > 0) {
            await fetchBottleInfo(allBarcodes);
          }
          
          logger.log(`Loaded ${data?.length || 0} scans grouped into ${grouped.length} orders`);
        }
      } catch (err: any) {
        logger.error('Unexpected error loading scans:', err);
        setError(`Unexpected error: ${err.message}`);
      }
      
      setLoading(false);
    };
    fetchScans();
  }, [profile]);

  const toggleOrderExpansion = (orderNumber: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
    }
    setExpandedOrders(newExpanded);
  };

  const openEditOrder = (order: GroupedOrder) => {
    if (!order.isEditable) {
      Alert.alert(
        'Edit Not Allowed',
        'Orders can only be edited within 24 hours of the first scan.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setEditOrder(order);
    setEditCustomer(order.customer_name || '');
    setEditOrderNumber(order.order_number || '');
    
    // Get unique bottle barcodes from scans
    const bottles = [...new Set(order.scans.map(s => s.bottle_barcode).filter(Boolean))];
    setEditBottles(bottles);
    setNewBottleBarcode('');
  };

  const addBottleToOrder = async () => {
    if (!newBottleBarcode.trim()) {
      Alert.alert('Error', 'Please enter a bottle barcode');
      return;
    }
    
    if (editBottles.includes(newBottleBarcode.trim())) {
      Alert.alert('Error', 'This bottle is already in the order');
      return;
    }
    
    // Fetch info for the new bottle
    await fetchBottleInfo([newBottleBarcode.trim()]);
    
    setEditBottles([...editBottles, newBottleBarcode.trim()]);
    setNewBottleBarcode('');
  };

  const removeBottleFromOrder = (barcode: string) => {
    Alert.alert(
      'Remove Bottle',
      `Remove ${barcode} from this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setEditBottles(editBottles.filter(b => b !== barcode));
          }
        }
      ]
    );
  };

  const saveEditOrder = async () => {
    if (!profile?.organization_id || !editOrder) {
      setError('Organization not found');
      return;
    }

    setSaving(true);
    
    try {
      const originalBottles = [...new Set(editOrder.scans.map(s => s.bottle_barcode).filter(Boolean))];
      const removedBottles = originalBottles.filter(b => !editBottles.includes(b));
      const addedBottles = editBottles.filter(b => !originalBottles.includes(b));
      
      // Delete scans for removed bottles
      if (removedBottles.length > 0) {
        const scansToDelete = editOrder.scans
          .filter(s => removedBottles.includes(s.bottle_barcode))
          .map(s => s.id);
        
        const { error: deleteError } = await supabase
          .from('bottle_scans')
          .delete()
          .in('id', scansToDelete)
          .eq('organization_id', profile.organization_id);
        
        if (deleteError) {
          throw deleteError;
        }
        
        logger.log(`Deleted ${scansToDelete.length} scans for removed bottles`);
      }
      
      // Update existing scans with new customer name and order number
      const scansToUpdate = editOrder.scans
        .filter(s => editBottles.includes(s.bottle_barcode))
        .map(s => s.id);
      
      if (scansToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('bottle_scans')
          .update({ 
            customer_name: editCustomer,
            order_number: editOrderNumber
          })
          .in('id', scansToUpdate)
          .eq('organization_id', profile.organization_id);
        
        if (updateError) {
          throw updateError;
        }
        
        logger.log(`Updated ${scansToUpdate.length} existing scans`);
      }
      
      // Create new scans for added bottles
      if (addedBottles.length > 0) {
        const newScans = addedBottles.map(barcode => ({
          organization_id: profile.organization_id,
          bottle_barcode: barcode,
          order_number: editOrderNumber,
          customer_name: editCustomer,
          mode: editOrder.scans[0]?.mode || 'SHIP',
          user_id: profile.id,
          created_at: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('bottle_scans')
          .insert(newScans);
        
        if (insertError) {
          throw insertError;
        }
        
        logger.log(`Created ${newScans.length} new scans for added bottles`);
      }
      
      // Refresh list
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error: fetchError } = await supabase
        .from('bottle_scans')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setScans(data || []);
      const grouped = groupScansByOrder(data || []);
      setGroupedOrders(grouped);
      
      // Fetch bottle info for new bottles
      const allBarcodes = data?.map(scan => scan.bottle_barcode).filter(Boolean) || [];
      if (allBarcodes.length > 0) {
        await fetchBottleInfo(allBarcodes);
      }
      
      setEditOrder(null);
      
      let message = `Order ${editOrderNumber} updated`;
      if (addedBottles.length > 0) message += `\n+${addedBottles.length} bottles added`;
      if (removedBottles.length > 0) message += `\n-${removedBottles.length} bottles removed`;
      
      Alert.alert('Success', message);
    } catch (err: any) {
      logger.error('Error updating order:', err);
      Alert.alert('Error', `Failed to update order: ${err.message}`);
    }
    
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan History (Last 24h)</Text>
      <Text style={styles.subtitle}>Grouped by Order Number</Text>
      
      {loading ? (
        <ActivityIndicator color="#40B5AD" size="large" style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={groupedOrders}
          keyExtractor={item => item.order_number}
          renderItem={({ item: order }) => {
            const isExpanded = expandedOrders.has(order.order_number);
            const bottleCount = order.scans.length;
            
            return (
              <View style={[styles.orderCard, !order.isEditable && styles.orderCardDisabled]}>
                {/* Order Header - Collapsible */}
                <TouchableOpacity 
                  style={styles.orderHeader}
                  onPress={() => toggleOrderExpansion(order.order_number)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderHeaderLeft}>
                    <Ionicons 
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                      size={24} 
                      color="#40B5AD" 
                    />
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderNumber}>Order: {order.order_number}</Text>
                      <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                      <Text style={styles.orderDate}>{formatDate(order.latest_date)}</Text>
                    </View>
                  </View>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{bottleCount}</Text>
                    <Text style={styles.orderBadgeLabel}>bottles</Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Bottle List */}
                {isExpanded && (
                  <View style={styles.bottleList}>
                    {order.scans.map((scan, index) => {
                      const info = bottleInfo.get(scan.bottle_barcode);
                      const isReturn = (scan.mode || '').toUpperCase() === 'RETURN';
                      const modeLabel = isReturn ? 'Return' : 'Shipped';
                      return (
                        <View key={scan.id} style={styles.bottleItem}>
                          <View style={styles.bottleItemContent}>
                            <View style={styles.bottleRow}>
                              <Text style={styles.bottleBarcode}>
                                {index + 1}. {scan.bottle_barcode}
                              </Text>
                              <View style={[styles.modeBadge, isReturn ? styles.modeBadgeReturn : styles.modeBadgeShip]}>
                                <Ionicons
                                  name={isReturn ? 'arrow-back' : 'arrow-forward'}
                                  size={12}
                                  color="#fff"
                                  style={{ marginRight: 4 }}
                                />
                                <Text style={styles.modeBadgeText}>{modeLabel}</Text>
                              </View>
                            </View>
                            {info && (
                              <Text style={styles.bottleType}>
                                {info.description || info.product_code || 'Unknown Type'}
                                {info.gas_type && ` • ${info.gas_type}`}
                              </Text>
                            )}
                            <Text style={styles.bottleDate}>{formatDate(scan.created_at)}</Text>
                          </View>
                        </View>
                      );
                    })}
                    
                    {/* Edit Button */}
                    <TouchableOpacity 
                      style={[
                        styles.editButton,
                        !order.isEditable && styles.editButtonDisabled
                      ]}
                      onPress={() => openEditOrder(order)}
                      disabled={!order.isEditable}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.editButtonText}>
                        {order.isEditable ? 'Edit Order' : 'Edit Expired'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {!order.isEditable && !isExpanded && (
                  <Text style={styles.expiredBadge}>Edit period expired</Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            !error ? (
              <Text style={styles.emptyText}>
                No scans in the last 24 hours.
              </Text>
            ) : null
          }
        />
      )}

      {/* Edit Order Modal */}
      <Modal 
        visible={!!editOrder} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setEditOrder(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Order</Text>
            <Text style={styles.modalSubtitle}>
              Editing {editOrder?.scans.length} bottles
            </Text>
            
            <Text style={styles.label}>Order Number</Text>
            <TextInput
              style={styles.input}
              value={editOrderNumber}
              onChangeText={setEditOrderNumber}
              placeholder="Order Number"
            />
            
            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              style={styles.input}
              value={editCustomer}
              onChangeText={setEditCustomer}
              placeholder="Customer Name"
            />
            
            {/* Bottles in order */}
            <Text style={styles.label}>Bottles in this order ({editBottles.length}):</Text>
            <ScrollView style={styles.modalBottleList}>
              {editBottles.map((barcode, index) => {
                const info = bottleInfo.get(barcode);
                const scan = editOrder?.scans.find(s => s.bottle_barcode === barcode);
                const isReturn = (scan?.mode || '').toUpperCase() === 'RETURN';
                const modeLabel = isReturn ? 'Return' : 'Shipped';
                return (
                  <View key={index} style={styles.modalBottleRow}>
                    <View style={styles.modalBottleInfo}>
                      <View style={styles.modalBottleRowTop}>
                        <Text style={styles.modalBottleBarcode}>
                          {index + 1}. {barcode}
                        </Text>
                        <View style={[styles.modeBadgeSmall, isReturn ? styles.modeBadgeReturn : styles.modeBadgeShip]}>
                          <Text style={styles.modeBadgeText}>{modeLabel}</Text>
                        </View>
                      </View>
                      {info && (
                        <Text style={styles.modalBottleType}>
                          {info.description || info.product_code || 'Unknown'}
                          {info.gas_type && ` • ${info.gas_type}`}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeBottleButton}
                      onPress={() => removeBottleFromOrder(barcode)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            
            {/* Add bottle section */}
            <Text style={styles.label}>Add Bottle:</Text>
            <View style={styles.addBottleContainer}>
              <TextInput
                style={[styles.input, styles.addBottleInput]}
                value={newBottleBarcode}
                onChangeText={setNewBottleBarcode}
                placeholder="Enter bottle barcode"
              />
              <TouchableOpacity
                style={styles.addBottleButton}
                onPress={addBottleToOrder}
              >
                <Ionicons name="add-circle" size={28} color="#40B5AD" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnCancel]} 
                onPress={() => setEditOrder(null)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btn, styles.btnSave]} 
                onPress={saveEditOrder} 
                disabled={saving}
              >
                <Text style={styles.btnSaveText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Order Card Styles
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  orderCardDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.8,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#888',
  },
  orderBadge: {
    backgroundColor: '#40B5AD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  orderBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderBadgeLabel: {
    fontSize: 10,
    color: '#fff',
    textTransform: 'uppercase',
  },
  expiredBadge: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12,
    color: '#ff5a1f',
    fontWeight: '600',
  },
  // Bottle List Styles
  bottleList: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#f9fafb',
  },
  bottleItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
  },
  bottleItemContent: {
    flex: 1,
  },
  bottleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  bottleBarcode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBadgeShip: {
    backgroundColor: '#40B5AD',
  },
  modeBadgeReturn: {
    backgroundColor: '#0ea5e9',
  },
  modeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  bottleType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  bottleDate: {
    fontSize: 11,
    color: '#888',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#40B5AD',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  editButtonDisabled: {
    backgroundColor: '#ccc',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  // General Styles
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
  },
  error: {
    color: '#ff5a1f',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#40B5AD',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
    marginTop: 12,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalBottleList: {
    maxHeight: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  modalBottleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 6,
  },
  modalBottleInfo: {
    flex: 1,
  },
  modalBottleRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  modalBottleBarcode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  modalBottleType: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  removeBottleButton: {
    padding: 4,
  },
  addBottleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addBottleInput: {
    flex: 1,
    marginBottom: 0,
  },
  addBottleButton: {
    padding: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#e5e7eb',
  },
  btnCancelText: {
    color: '#40B5AD',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnSave: {
    backgroundColor: '#40B5AD',
  },
  btnSaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
}); 