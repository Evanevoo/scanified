import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView, Dimensions } from 'react-native';
import { supabase } from '../supabase';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export default function HistoryScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const [scans, setScans] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editScan, setEditScan] = useState(null);
  const [editCustomer, setEditCustomer] = useState('');
  const [editAssets, setEditAssets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [bottleSuggestions, setBottleSuggestions] = useState([]);
  const [showBottleSuggestions, setShowBottleSuggestions] = useState({});
  const [bottles, setBottles] = useState([]);
  const [itemDetails, setItemDetails] = useState({});

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!profile?.organization_id) return;
      
      const { data, error } = await supabase
        .from('customers')
        .select('name, CustomerListID')
        .eq('organization_id', profile.organization_id)
        .order('name');
      
      if (error) {
        logger.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
    };
    
    if (profile?.organization_id) {
      fetchCustomers();
    }
  }, [profile]);

  // Fetch bottles
  useEffect(() => {
    const fetchBottles = async () => {
      if (!profile?.organization_id) return;
      
      const { data, error } = await supabase
        .from('bottles')
        .select('barcode_number')
        .eq('organization_id', profile.organization_id)
        .order('barcode_number');
      
      if (error) {
        logger.error('Error fetching bottles:', error);
      } else {
        setBottles(data || []);
      }
    };
    
    if (profile?.organization_id) {
      fetchBottles();
    }
  }, [profile]);

  // Group scans by order_number AND customer_name (to properly separate different customers/orders)
  const groupScansByOrderNumber = (scans) => {
    const grouped = {};
    
    scans.forEach(scan => {
      // Create a composite key using both order_number and customer_name
      // This ensures scans with same order_number but different customers are grouped separately
      const orderNumber = scan.order_number || null;
      const customerName = scan.customer_name || 'Unknown Customer';
      
      // Use a composite key: order_number + customer_name
      // If no order_number, group by customer_name only
      const orderKey = orderNumber 
        ? `${orderNumber}||${customerName}` 
        : `no-order||${customerName}||${scan.id}`; // Unique key for scans without order_number
      
      if (!grouped[orderKey]) {
        grouped[orderKey] = {
          order_number: orderNumber,
          scans: [],
          customer_name: customerName,
          created_at: scan.created_at,
          verified: scan.verified || false,
          // Get the earliest created_at for the group
          earliest_created_at: scan.created_at,
        };
      }
      
      grouped[orderKey].scans.push(scan);
      
      // Update earliest created_at if this scan is older
      if (new Date(scan.created_at) < new Date(grouped[orderKey].earliest_created_at)) {
        grouped[orderKey].earliest_created_at = scan.created_at;
      }
      
      // If any scan is verified, mark the group as verified
      if (scan.verified) {
        grouped[orderKey].verified = true;
      }
    });
    
    // Convert to array and sort by earliest_created_at (most recent first)
    return Object.values(grouped).sort((a, b) => 
      new Date(b.earliest_created_at) - new Date(a.earliest_created_at)
    );
  };

  // Filter customer suggestions
  useEffect(() => {
    if (editCustomer.trim() && customers.length > 0) {
      const searchText = editCustomer.toLowerCase();
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchText) &&
        customer.name.toLowerCase() !== searchText
      ).slice(0, 5);
      setCustomerSuggestions(filtered);
      setShowCustomerSuggestions(filtered.length > 0);
    } else {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
    }
  }, [editCustomer, customers]);

  // Filter bottle suggestions
  const filterBottleSuggestions = (searchText, index) => {
    if (searchText && searchText.trim() && bottles.length > 0) {
      const filtered = bottles
        .filter(bottle => 
          bottle.barcode_number && 
          bottle.barcode_number.toLowerCase().includes(searchText.toLowerCase())
        )
        .slice(0, 5);
      
      setBottleSuggestions(filtered);
      setShowBottleSuggestions(prev => ({ ...prev, [index]: filtered.length > 0 }));
    } else {
      setShowBottleSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  // Fetch item details
  const fetchItemDetails = async (barcode) => {
    if (!barcode || !profile?.organization_id) return null;
    
    try {
      logger.log('🔍 Fetching item details for barcode:', barcode);
      
      const { data, error } = await supabase
        .from('bottles')
        .select('barcode_number, product_code, description, status, location, customer_name')
        .eq('barcode_number', barcode)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();
      
      logger.log('🔍 Item details result:', { data, error });
      
      if (error) {
        logger.error('❌ Error fetching item details:', error);
        return null;
      }
      
      if (!data) {
        logger.log('⚠️ No item found for barcode:', barcode);
        return null;
      }
      
      const details = {
        barcode: data.barcode_number,
        productCode: data.product_code,
        description: data.description,
        status: data.status,
        location: data.location,
        customerName: data.customer_name,
      };
      
      logger.log('✅ Item details fetched:', details);
      return details;
    } catch (err) {
      logger.error('❌ Error in fetchItemDetails:', err);
      return null;
    }
  };

  const handleAssetChange = async (index, value) => {
    const oldValue = editAssets[index];
    updateAsset(index, value);
    
    // Clear old details
    if (oldValue && oldValue !== value && itemDetails[oldValue]) {
      setItemDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[oldValue];
        return newDetails;
      });
    }
    
    // Show suggestions if there's text
    if (value.trim()) {
      filterBottleSuggestions(value, index);
    } else {
      setShowBottleSuggestions(prev => ({ ...prev, [index]: false }));
    }
    
    // Fetch details after a delay
    if (value.trim() && value.length >= 3) {
      setTimeout(async () => {
        logger.log('🔍 Fetching details after timeout for:', value);
        const details = await fetchItemDetails(value);
        if (details) {
          logger.log('✅ Setting item details:', value, details);
          setItemDetails(prev => ({ ...prev, [value]: details }));
        } else {
          logger.log('⚠️ No details found for:', value);
        }
      }, 500);
    }
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
          // Group scans by order_number
          const groupedScans = groupScansByOrderNumber(data || []);
          setScans(groupedScans);
          logger.log(`Loaded ${data?.length || 0} scans, grouped into ${groupedScans.length} orders`);
        }
      } catch (err) {
        logger.error('Unexpected error loading scans:', err);
        setError(`Unexpected error: ${err.message}`);
      }
      
      setLoading(false);
    };
    fetchScans();
  }, [profile]);

  const toggleOrderExpansion = async (orderKey: string, orderScans: any[]) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderKey)) {
      newExpanded.delete(orderKey);
    } else {
      newExpanded.add(orderKey);
      
      // Fetch bottle details for all bottles in this order
      const barcodes = orderScans.map(s => s.bottle_barcode).filter(Boolean);
      for (const barcode of barcodes) {
        if (!itemDetails[barcode]) {
          const details = await fetchItemDetails(barcode);
          if (details) {
            setItemDetails(prev => ({ ...prev, [barcode]: details }));
          }
        }
      }
    }
    setExpandedOrders(newExpanded);
  };

  const openEdit = (groupedItem) => {
    // Check if scan is within 24 hours
    const scanTime = new Date(groupedItem.earliest_created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      Alert.alert(
        'Edit Not Allowed',
        'Scans can only be edited within 24 hours of submission.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Store the entire grouped item so we can update all scans
    setEditScan(groupedItem);
    setEditCustomer(groupedItem.customer_name || '');
    
    // Extract all unique barcodes from all scans in the group
    const allAssets = [];
    groupedItem.scans.forEach(scan => {
      // Each scan has a bottle_barcode field
      if (scan.bottle_barcode && !allAssets.includes(scan.bottle_barcode)) {
        allAssets.push(scan.bottle_barcode);
      }
    });
    
    // If no assets found, add an empty one
    if (allAssets.length === 0) {
      allAssets.push('');
    }
    
    setEditAssets(allAssets);
  };

  const saveEdit = async () => {
    if (!profile?.organization_id) {
      setError('Organization not found');
      return;
    }

    setSaving(true);
    
    // Update all scans in the group
    const scansToUpdate = editScan?.scans || [];
    const filteredAssets = editAssets.filter(a => a); // Remove empty strings
    
    if (scansToUpdate.length > 0) {
      // Update each scan, mapping barcodes from editAssets to scans
      // Try to preserve original barcode mapping if possible
      const updatePromises = scansToUpdate.map((scan, index) => {
        // Try to preserve the original barcode if it's still in the edited assets
        let bottleBarcode = '';
        if (scan.bottle_barcode && filteredAssets.includes(scan.bottle_barcode)) {
          // Original barcode is still in the list, keep it
          bottleBarcode = scan.bottle_barcode;
        } else if (filteredAssets.length > 0) {
          // Map barcodes to scans - use index to cycle through if we have fewer barcodes than scans
          const assetIndex = index % filteredAssets.length;
          bottleBarcode = filteredAssets[assetIndex];
        }
        // If no barcodes provided, leave bottle_barcode as is (don't update it)
        
        const updateData: any = {
          customer_name: editCustomer,
        };
        
        // Only update bottle_barcode if we have a value
        if (bottleBarcode) {
          updateData.bottle_barcode = bottleBarcode;
        }
        
        return supabase
          .from('bottle_scans')
          .update(updateData)
          .eq('id', scan.id)
          .eq('organization_id', profile.organization_id);
      });
      
      const results = await Promise.all(updatePromises);
      const hasError = results.some(r => r.error);
      
      if (hasError) {
        logger.error('Error updating scans:', results);
        Alert.alert('Error', 'Failed to update some scans. Please try again.');
      }
    }
    
    setSaving(false);
    setEditScan(null);
    // Refresh list
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('bottle_scans')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    // Group scans by order_number
    const groupedScans = groupScansByOrderNumber(data || []);
    setScans(groupedScans);
  };

  const deleteScan = async () => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!profile?.organization_id) {
              setError('Organization not found');
              return;
            }

            setSaving(true);
            // Delete all scans in the group
            const scanIds = editScan?.scans?.map(s => s.id) || [];
            const deletePromises = scanIds.map(scanId =>
              supabase
                .from('bottle_scans')
                .delete()
                .eq('id', scanId)
                .eq('organization_id', profile.organization_id)
            );
            const results = await Promise.all(deletePromises);
            const { error } = results.find(r => r.error) || { error: null };

            setSaving(false);
            
            if (error) {
              Alert.alert('Error', 'Failed to delete scan. Please try again.');
            } else {
              setEditScan(null);
              // Refresh list
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const { data } = await supabase
                .from('bottle_scans')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .gte('created_at', since)
                .order('created_at', { ascending: false });
              // Group scans by order_number
              const groupedScans = groupScansByOrderNumber(data || []);
              setScans(groupedScans);
            }
          }
        }
      ]
    );
  };

  const addAsset = () => {
    setEditAssets([...editAssets, '']);
  };

  const removeAsset = (index) => {
    const newAssets = editAssets.filter((_, i) => i !== index);
    setEditAssets(newAssets);
  };

  const updateAsset = (index, value) => {
    const newAssets = [...editAssets];
    newAssets[index] = value;
    setEditAssets(newAssets);
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
          data={scans}
          keyExtractor={item => item.order_number || `no-order-${item.scans[0]?.id}`}
          renderItem={({ item }) => {
            const scanTime = new Date(item.earliest_created_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
            const isEditable = hoursDiff <= 24;
            const orderKey = item.order_number || `no-order-${item.scans[0]?.id}`;
            const isExpanded = expandedOrders.has(orderKey);
            
            // Get all unique bottle barcodes from the grouped scans
            const bottleBarcodes = item.scans
              .map(s => s.bottle_barcode || s.assets?.[0])
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
            
            return (
              <View style={[styles.orderCard, !isEditable && styles.orderCardDisabled]}>
                {/* Order Header - Collapsible */}
                <TouchableOpacity 
                  style={styles.orderHeader}
                  onPress={() => toggleOrderExpansion(orderKey, item.scans)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderHeaderLeft}>
                    <Ionicons 
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                      size={24} 
                      color="#40B5AD" 
                    />
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderNumber}>
                        {item.order_number || 'No Order Number'}
                      </Text>
                      <Text style={styles.orderCustomer}>{item.customer_name || 'No Customer'}</Text>
                      <Text style={styles.orderDate}>{formatDate(item.earliest_created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{bottleBarcodes.length}</Text>
                    <Text style={styles.orderBadgeLabel}>bottles</Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Bottle List */}
                {isExpanded && (
                  <View style={styles.bottleList}>
                    {item.scans.map((scan, index) => {
                      const info = itemDetails[scan.bottle_barcode];
                      return (
                        <View key={scan.id} style={styles.bottleItem}>
                          <View style={styles.bottleItemContent}>
                            <Text style={styles.bottleBarcode}>
                              {index + 1}. {scan.bottle_barcode || 'N/A'}
                            </Text>
                            {info && (
                              <Text style={styles.bottleType}>
                                {info.description || info.productCode || 'Unknown Type'}
                                {info.productCode && ` (${info.productCode})`}
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
                        !isEditable && styles.editButtonDisabled
                      ]}
                      onPress={() => openEdit(item)}
                      disabled={!isEditable}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.editButtonText}>
                        {isEditable ? 'Edit Order' : 'Edit Expired'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {!isEditable && !isExpanded && (
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
      {/* Edit Modal */}
      <Modal visible={!!editScan} animationType="slide" transparent onRequestClose={() => setEditScan(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Scan</Text>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Customer Selection */}
              <Text style={styles.label}>Customer</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={editCustomer}
                onChangeText={setEditCustomer}
                placeholder="Type or select customer..."
              />
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowCustomerPicker(true)}
              >
                <Text style={styles.pickerButtonText}>📋</Text>
              </TouchableOpacity>
              {showCustomerSuggestions && customerSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {customerSuggestions.map((customer) => (
                    <TouchableOpacity
                      key={customer.CustomerListID}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setEditCustomer(customer.name);
                        setShowCustomerSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{customer.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Assets List */}
            <Text style={styles.label}>{assetConfig?.assetDisplayNamePlural || 'Assets'} ({editAssets.length})</Text>
            {editAssets.map((asset, index) => (
              <View key={index} style={styles.assetRowContainer}>
                <View style={styles.assetRow}>
                  <TextInput
                    style={[styles.input, styles.assetInput]}
                    value={asset}
                    onChangeText={v => handleAssetChange(index, v)}
                    placeholder={`${assetConfig?.assetDisplayName || 'Asset'} ${index + 1} barcode`}
                  />
                  {editAssets.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeAsset(index)}
                    >
                      <Text style={styles.removeButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* Item Details */}
                {itemDetails[asset] && asset.trim() && (
                  <View style={styles.itemDetailsContainer}>
                    <Text style={styles.itemDetailsLabel}>Item Details:</Text>
                    <Text style={styles.itemDetailsText}>
                      {itemDetails[asset].description || itemDetails[asset].productCode || 'No description'}
                      {itemDetails[asset].productCode && ` • ${itemDetails[asset].productCode}`}
                      {itemDetails[asset].status && ` • Status: ${itemDetails[asset].status}`}
                      {itemDetails[asset].location && ` • Location: ${itemDetails[asset].location}`}
                      {itemDetails[asset].customerName && ` • Customer: ${itemDetails[asset].customerName}`}
                    </Text>
                  </View>
                )}
                {/* Bottle Suggestions */}
                {showBottleSuggestions[index] && bottleSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView style={{ maxHeight: 120 }}>
                      {bottleSuggestions.map((bottle, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.suggestionItem}
                        onPress={async () => {
                          const barcode = bottle.barcode_number;
                          updateAsset(index, barcode);
                          setShowBottleSuggestions(prev => ({ ...prev, [index]: false }));
                          setBottleSuggestions([]);
                          
                          // Fetch details for the selected barcode
                          const details = await fetchItemDetails(barcode);
                          if (details) {
                            setItemDetails(prev => ({ ...prev, [barcode]: details }));
                          }
                        }}
                        >
                          <Text style={styles.suggestionText}>{bottle.barcode_number}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ))}
            
            {/* Add Asset Button */}
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addAsset}
            >
              <Text style={styles.addButtonText}>+ Add {assetConfig?.assetDisplayName || 'Asset'}</Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: '#dc2626', marginTop: 12 }]} 
              onPress={deleteScan} 
              disabled={saving}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete Scan</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#eee', flex: 1, marginRight: 8 }]} onPress={() => setEditScan(null)}>                   
                <Text style={{ color: '#40B5AD', fontWeight: 'bold' }}>Cancel</Text>                                                                            
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#40B5AD', flex: 1, marginLeft: 8 }]} onPress={saveEdit} disabled={saving}>              
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{saving ? 'Saving...' : 'Save'}</Text>                                                      
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal 
        visible={showCustomerPicker} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <ScrollView style={styles.customerList}>
              <TouchableOpacity 
                style={styles.customerItem}
                onPress={() => {
                  setEditCustomer('');
                  setShowCustomerPicker(false);
                }}
              >
                <Text style={styles.customerItemText}>
                  {editCustomer === '' ? '✓ No customer' : 'No customer'}
                </Text>
              </TouchableOpacity>
              {customers.map((customer) => (
                <TouchableOpacity 
                  key={customer.CustomerListID}
                  style={styles.customerItem}
                  onPress={() => {
                    setEditCustomer(customer.name);
                    setShowCustomerPicker(false);
                  }}
                >
                  <Text style={[styles.customerItemText, editCustomer === customer.name && { fontWeight: 'bold', color: '#40B5AD' }]}>
                    {editCustomer === customer.name && '✓ '}{customer.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#40B5AD', marginTop: 18 }]} onPress={() => setShowCustomerPicker(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  bottleBarcode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
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
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: SCREEN_HEIGHT * 0.85,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  modalScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#40B5AD',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  btn: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#222',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetInput: {
    flex: 1,
  },
  removeButton: {
    marginLeft: 8,
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  addButtonText: {
    color: '#40B5AD',
    fontWeight: '600',
    fontSize: 14,
  },
  customerList: {
    maxHeight: 400,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  customerItemText: {
    fontSize: 16,
    color: '#222',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButton: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 20,
  },
  assetRowContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#222',
  },
  itemDetailsContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  itemDetailsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 4,
  },
  itemDetailsText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
}); 