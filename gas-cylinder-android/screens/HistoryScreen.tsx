import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { useAssetConfig } from '../context/AssetContext';
import { useAuth } from '../hooks/useAuth';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export default function HistoryScreen() {
  const { config: assetConfig } = useAssetConfig();
  const { profile } = useAuth();
  const [scans, setScans] = useState([]);
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
          setScans(data || []);
          logger.log(`Loaded ${data?.length || 0} scans`);
        }
      } catch (err) {
        logger.error('Unexpected error loading scans:', err);
        setError(`Unexpected error: ${err.message}`);
      }
      
      setLoading(false);
    };
    fetchScans();
  }, [profile]);

  const openEdit = (scan) => {
    // Check if scan is within 24 hours
    const scanTime = new Date(scan.created_at);
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
    
    setEditScan(scan);
    setEditCustomer(scan.customer_name || '');
    // Parse assets if they exist, otherwise use bottle_barcode
    if (scan.assets && Array.isArray(scan.assets)) {
      setEditAssets(scan.assets);
    } else if (scan.bottle_barcode) {
      setEditAssets([scan.bottle_barcode]);
    } else {
      setEditAssets(['']);
    }
  };

  const saveEdit = async () => {
    if (!profile?.organization_id) {
      setError('Organization not found');
      return;
    }

    setSaving(true);
    // Get the first asset barcode or empty string
    const assetBarcode = editAssets.length > 0 ? editAssets[0] : '';
    
    const { error } = await supabase
      .from('bottle_scans')
      .update({ 
        customer_name: editCustomer, 
        bottle_barcode: assetBarcode,
        assets: editAssets 
      })
      .eq('id', editScan?.id)
      .eq('organization_id', profile.organization_id);
    
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
    setScans(data || []);
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
            const { error } = await supabase
              .from('bottle_scans')
              .delete()
              .eq('id', editScan?.id)
              .eq('organization_id', profile.organization_id);

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
              setScans(data || []);
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
      <Text style={styles.title}>Unverified Scans (Last 24h)</Text>
      {loading ? <ActivityIndicator color="#40B5AD" /> : error ? <Text style={styles.error}>{error}</Text> : (
        <FlatList
          data={scans}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const scanTime = new Date(item.created_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
            const isEditable = hoursDiff <= 24;
            
            return (
              <TouchableOpacity 
                style={[styles.scanItem, !isEditable && styles.scanItemDisabled]} 
                onPress={() => openEdit(item)}
              >
                <Text style={styles.scanBarcode}>{item.bottle_barcode}</Text>
                <Text style={styles.scanCustomer}>{item.customer_name}</Text>
                <Text style={styles.scanDate}>{formatDate(item.created_at)}</Text>
                <Text style={styles.scanStatus}>Verified: {item.verified ? 'Yes' : 'No'}</Text>
                {!isEditable && (
                  <Text style={styles.scanExpired}>Edit expired</Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={!error ? <Text style={{ color: '#888', textAlign: 'center', marginTop: 24 }}>No unverified scans in the last 24 hours.</Text> : null}
        />
      )}
      {/* Edit Modal */}
      <Modal visible={!!editScan} animationType="slide" transparent onRequestClose={() => setEditScan(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Scan</Text>
            
            {/* Customer Selection */}
            <Text style={styles.label}>Customer</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={editCustomer}
                onChangeText={(v) => {
                  setEditCustomer(v);
                  setCustomerSearch(v);
                }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 16,
    textAlign: 'center',
  },
  scanItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  scanItemDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  scanBarcode: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#40B5AD',
    marginBottom: 2,
  },
  scanCustomer: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
  },
  scanDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  scanStatus: {
    fontSize: 12,
    color: '#888',
  },
  scanExpired: {
    fontSize: 12,
    color: '#ff5a1f',
    fontWeight: 'bold',
    marginTop: 4,
  },
  error: {
    color: '#ff5a1f',
    textAlign: 'center',
    marginTop: 16,
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
    alignItems: 'stretch',
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