import logger from '../utils/logger';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert, ScrollView, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import ScanArea from '../components/ScanArea';
import { useAuth } from '../hooks/useAuth';
import { CylinderLimitService } from '../services/CylinderLimitService';
import { useAssetConfig } from '../context/AssetContext';
import { useNavigation } from '@react-navigation/native';

const BATCH_INSERT_SIZE = 50;

interface PendingBottle {
  id: string;
  barcode: string;
  serial: string;
}

interface GasType {
  id: number;
  category: string;
  group_name: string;
  type: string;
  product_code: string;
  description: string;
  in_house_total: number;
  with_customer_total: number;
  lost_total: number;
  total: number;
  dock_stock: string;
}

interface Location {
  id: string;
  name: string;
  province: string;
  gst_rate: number;
  pst_rate: number;
  total_tax_rate: number;
}

export default function AddCylinderScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 48 : Math.max(insets.bottom, 24) + 40;
  const { config: assetConfig } = useAssetConfig();
  const navigation = useNavigation();
  const [pendingBottles, setPendingBottles] = useState<PendingBottle[]>([]);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [currentSerial, setCurrentSerial] = useState('');
  const [gasTypes, setGasTypes] = useState<GasType[]>([]);
  const [selectedGasType, setSelectedGasType] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGasTypes, setLoadingGasTypes] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { profile } = useAuth();

  const searchCustomerByName = async (possibleNames: string[]): Promise<{ name: string; id: string } | null> => {
    if (!profile?.organization_id || possibleNames.length === 0) return null;
    try {
      for (const name of possibleNames) {
        if (!name || name.length < 3) continue;
        const { data: customers } = await supabase
          .from('customers')
          .select('CustomerListID, name')
          .eq('organization_id', profile.organization_id)
          .ilike('name', `%${name}%`)
          .limit(1);
        if (customers && customers.length > 0) {
          const found = customers[0];
          return { name: found.name, id: found.CustomerListID };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleOcrCustomerFound = (customer: { name: string; id: string }) => {
    setScannerVisible(false);
    navigation.navigate('CustomerDetails', { customerId: customer.id });
  };

  const [scannerVisible, setScannerVisible] = useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [gasTypeSearch, setGasTypeSearch] = useState('');
  const [gasTypeSuggestionsVisible, setGasTypeSuggestionsVisible] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [ownerPickerVisible, setOwnerPickerVisible] = useState(false);

  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [addingOwner, setAddingOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');

  const getGasTypeLabel = (gt: GasType) => {
    const base = `${gt.category} - ${gt.type}`;
    return gt.description ? `${base} · ${gt.description}` : base;
  };

  const gasTypeSuggestions = useMemo(() => {
    if (!gasTypeSearch.trim()) return [];
    const q = gasTypeSearch.trim().toLowerCase();
    const toSearchStr = (gt: GasType) => [
      getGasTypeLabel(gt),
      gt.group_name || '',
      gt.product_code || '',
      gt.description || '',
    ].join(' ').toLowerCase();
    return gasTypes.filter(gt => toSearchStr(gt).includes(q)).slice(0, 12);
  }, [gasTypes, gasTypeSearch]);

  useEffect(() => {
    if (selectedGasType) setGasTypeSuggestionsVisible(false);
  }, [selectedGasType]);

  useEffect(() => {
    const fetchGasTypes = async () => {
      setLoadingGasTypes(true);
      setError('');
      const { data, error } = await supabase
        .from('gas_types')
        .select('*')
        .order('category', { ascending: true })
        .order('group_name', { ascending: true })
        .order('type', { ascending: true });
      if (error) {
        setError('Failed to load gas types.');
        return;
      }
      setGasTypes(data || []);
      setLoadingGasTypes(false);
    };
    fetchGasTypes();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      setError('');
      if (!profile?.organization_id) {
        setLocations([]);
        setLoadingLocations(false);
        return;
      }
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name', { ascending: true });
      if (error) {
        setError('Failed to load locations.');
        setLocations([]);
        setLoadingLocations(false);
        return;
      }
      setLocations(data || []);
      setLoadingLocations(false);
    };
    fetchLocations();
  }, [profile]);

  useEffect(() => {
    // Fetch ownership values for the current organization
    const fetchOwners = async () => {
      if (!profile?.organization_id) return;
      const { data, error } = await supabase
        .from('ownership_values')
        .select('id, value')
        .eq('organization_id', profile.organization_id)
        .order('value', { ascending: true });
      if (!error && data) {
        // Map the data to match the expected format (name -> value)
        setOwners(data.map(item => ({ id: item.id, name: item.value })));
      }
    };
    fetchOwners();
  }, [profile]);

  const addCurrentToPending = useCallback(async (): Promise<boolean> => {
    const b = (currentBarcode || '').trim();
    if (!b) return false;
    if (profile?.organization_id) {
      const { data: existing } = await supabase
        .from('bottles')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('barcode_number', b)
        .limit(1);
      if (existing && existing.length > 0) {
        Alert.alert(
          'Barcode already in system',
          `The barcode "${b}" is already registered. It was not added to the list.`,
          [{ text: 'OK', style: 'default' }]
        );
        return false;
      }
    }
    setPendingBottles(prev => [...prev, { id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`, barcode: b, serial: (currentSerial || '').trim() }]);
    setCurrentBarcode('');
    setCurrentSerial('');
    return true;
  }, [currentBarcode, currentSerial, profile?.organization_id]);

  const handleAddFromSerialModal = useCallback(async () => {
    const added = await addCurrentToPending();
    if (added) {
      setShowSerialModal(false);
      setScannerVisible(true);
    }
  }, [addCurrentToPending]);

  const removePendingRow = useCallback((id: string) => {
    setPendingBottles(prev => prev.filter(r => r.id !== id));
  }, []);

  const setScannedBarcode = useCallback((scannedBarcode: string) => {
    const trimmed = (scannedBarcode || '').trim();
    if (!trimmed) return;
    setCurrentBarcode(trimmed);
    setCurrentSerial('');
    setScannerVisible(false);
    setShowSerialModal(true);
  }, []);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    const validRows = pendingBottles.filter(r => (r.barcode || '').trim() !== '');
    if (validRows.length === 0) {
      setError('Add at least one bottle (barcode required).');
      return;
    }
    if (!selectedGasType || !selectedLocation) {
      setError('Gas type and location are required for all bottles.');
      return;
    }
    setLoading(true);

    if (profile?.organization_id) {
      const validation = await CylinderLimitService.validateCylinderAddition(profile.organization_id, validRows.length);
      if (!validation.isValid) {
        setLoading(false);
        Alert.alert(validation.message.title, validation.message.message, [{ text: 'OK', style: 'default' }]);
        return;
      }
    }

    const selectedGasTypeData = gasTypes.find(gt => gt.id.toString() === selectedGasType);
    if (!selectedGasTypeData) {
      setError('Invalid gas type selected.');
      setLoading(false);
      return;
    }
    const selectedLocationData = locations.find(loc => loc.id === selectedLocation);
    if (!selectedLocationData) {
      setError('Invalid location selected.');
      setLoading(false);
      return;
    }

    const barcodes = validRows.map(r => (r.barcode || '').trim());
    const serials = validRows.map(r => (r.serial || '').trim() || (r.barcode || '').trim());
    const seenBarcodes = new Set<string>();
    const duplicateInBatch: string[] = [];
    validRows.forEach(r => {
      const b = (r.barcode || '').trim();
      if (seenBarcodes.has(b)) duplicateInBatch.push(b);
      else seenBarcodes.add(b);
    });
    if (duplicateInBatch.length > 0) {
      setError(`Duplicate barcodes in list: ${[...new Set(duplicateInBatch)].slice(0, 5).join(', ')}${duplicateInBatch.length > 5 ? '...' : ''}`);
      setLoading(false);
      return;
    }

    const { data: existingByBarcode } = await supabase
      .from('bottles')
      .select('barcode_number')
      .eq('organization_id', profile!.organization_id)
      .in('barcode_number', barcodes);
    const existingBarcodes = new Set((existingByBarcode || []).map(b => (b.barcode_number || '').trim()));

    const { data: existingBySerial } = await supabase
      .from('bottles')
      .select('serial_number')
      .eq('organization_id', profile!.organization_id)
      .in('serial_number', serials);
    const existingSerials = new Set((existingBySerial || []).map(b => (b.serial_number || '').trim()));

    const toInsert: typeof validRows = [];
    const skipped: string[] = [];
    validRows.forEach(r => {
      const b = (r.barcode || '').trim();
      const s = (r.serial || '').trim() || b;
      if (existingBarcodes.has(b)) {
        skipped.push(`Barcode ${b}`);
        return;
      }
      if (s !== b && existingSerials.has(s)) {
        skipped.push(`Serial ${s}`);
        return;
      }
      toInsert.push(r);
    });

    if (toInsert.length === 0) {
      setError(skipped.length > 0 ? `All bottles already exist: ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '...' : ''}` : 'No bottles to add.');
      setLoading(false);
      return;
    }

    const baseRow = {
      gas_type: selectedGasTypeData.type,
      group_name: selectedGasTypeData.group_name,
      category: selectedGasTypeData.category,
      product_code: selectedGasTypeData.product_code,
      description: selectedGasTypeData.description,
      location: (selectedLocationData.name || '').toUpperCase().replace(/\s+/g, '_'),
      ownership: selectedOwner || undefined,
      organization_id: profile!.organization_id,
    };

    for (let i = 0; i < toInsert.length; i += BATCH_INSERT_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_INSERT_SIZE);
      const rows = batch.map(r => ({
        ...baseRow,
        barcode_number: (r.barcode || '').trim(),
        serial_number: (r.serial || '').trim() || (r.barcode || '').trim(),
      }));
      const { error: insertError } = await supabase.from('bottles').insert(rows);
      if (insertError) {
        logger.error('Batch insert error:', insertError);
        setError(`Failed to add bottles: ${insertError.message}`);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    const added = toInsert.length;
    const skipMsg = skipped.length > 0 ? ` (${skipped.length} already existed)` : '';
    setSuccess(`${added} ${assetConfig?.assetDisplayName || 'Asset'}${added !== 1 ? 's' : ''} added successfully!${skipMsg}`);
    setPendingBottles([]);
    setCurrentBarcode('');
    setCurrentSerial('');
    setSelectedGasType('');
    setGasTypeSearch('');
    setSelectedLocation('');
  };

  // Add new ownership value
  const handleAddOwner = async () => {
    if (!newOwnerName.trim() || !profile?.organization_id) return;
    const { data, error } = await supabase
      .from('ownership_values')
      .insert({ value: newOwnerName.trim(), organization_id: profile.organization_id })
      .select();
    if (!error && data && data[0]) {
      setOwners([...owners, { id: data[0].id, name: data[0].value }]);
      setSelectedOwner(data[0].value);
      setAddingOwner(false);
      setNewOwnerName('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background, paddingBottom: scrollPaddingBottom }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => setGasTypeSuggestionsVisible(false)}
      showsVerticalScrollIndicator={true}
    >
      {/* Details — set once for all bottles */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Gas Type</Text>
          {loadingGasTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading gas types...</Text>
            </View>
          ) : (
            <View style={styles.gasTypeSearchWrapper}>
              <View style={[styles.gasTypeSearchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, styles.gasTypeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, flex: 1, marginRight: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                  placeholder="Search gas type..."
                  placeholderTextColor={colors.textSecondary}
                  value={selectedGasType ? (() => { const gt = gasTypes.find(g => g.id.toString() === selectedGasType); return gt ? getGasTypeLabel(gt) : gasTypeSearch; })() : gasTypeSearch}
                  onChangeText={(text) => {
                    setSelectedGasType('');
                    setGasTypeSearch(text);
                    setGasTypeSuggestionsVisible(true);
                  }}
                  onFocus={() => {
                    setGasTypeSuggestionsVisible(true);
                    if (selectedGasType) {
                      const gt = gasTypes.find(g => g.id.toString() === selectedGasType);
                      if (gt) setGasTypeSearch(getGasTypeLabel(gt));
                      setSelectedGasType('');
                    }
                  }}
                  onBlur={() => setTimeout(() => setGasTypeSuggestionsVisible(false), 200)}
                  autoCapitalize="none"
                />
                {(selectedGasType || ((gasTypeSearch || '').trim() !== '')) ? (
                  <TouchableOpacity
                    style={[styles.searchClearBtn, { backgroundColor: colors.border }]}
                    onPress={() => {
                      setSelectedGasType('');
                      setGasTypeSearch('');
                      setGasTypeSuggestionsVisible(true);
                      Keyboard.dismiss();
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {gasTypeSuggestionsVisible && (gasTypeSearch.trim() || !selectedGasType) && (
                <View style={[styles.suggestionsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {gasTypeSearch.trim() ? (
                    gasTypeSuggestions.length > 0 ? (
                      gasTypeSuggestions.map(gt => (
                        <TouchableOpacity
                          key={gt.id}
                          style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setSelectedGasType(gt.id.toString());
                            setGasTypeSearch('');
                            setGasTypeSuggestionsVisible(false);
                            Keyboard.dismiss();
                          }}
                        >
                          <Text style={[styles.suggestionText, { color: colors.text }]}>{getGasTypeLabel(gt)}</Text>
                          {(gt.group_name || gt.product_code) && (
                            <Text style={[styles.suggestionSubtext, { color: colors.textSecondary }]}>
                              {[gt.group_name, gt.product_code].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.suggestionEmpty}>
                        <Text style={[styles.suggestionEmptyText, { color: colors.textSecondary }]}>No matches found</Text>
                      </View>
                    )
                  ) : (
                    gasTypes.slice(0, 8).map(gt => (
                      <TouchableOpacity
                        key={gt.id}
                        style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setSelectedGasType(gt.id.toString());
                          setGasTypeSearch('');
                          setGasTypeSuggestionsVisible(false);
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={[styles.suggestionText, { color: colors.text }]}>{getGasTypeLabel(gt)}</Text>
                        {gt.description ? (
                          <Text style={[styles.suggestionSubtext, { color: colors.textSecondary }]}>{gt.description}</Text>
                        ) : (gt.group_name || gt.product_code) ? (
                          <Text style={[styles.suggestionSubtext, { color: colors.textSecondary }]}>
                            {[gt.group_name, gt.product_code].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
          {loadingLocations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading locations...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setLocationPickerVisible(true)}
            >
              <Text style={[styles.pickerButtonText, { color: selectedLocation ? colors.text : colors.textSecondary }]}>
                {selectedLocation 
                  ? locations.find(loc => loc.id === selectedLocation)?.name || 'Select Location'
                  : 'Select Location'
                }
              </Text>
              <Text style={[styles.pickerArrow, { color: colors.text }]}>▼</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Ownership</Text>
          <TouchableOpacity 
            style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setOwnerPickerVisible(true)}
          >
            <Text style={[styles.pickerButtonText, { color: selectedOwner ? colors.text : colors.textSecondary }]}>
              {selectedOwner || 'Select Owner'}
            </Text>
            <Text style={[styles.pickerArrow, { color: colors.text }]}>▼</Text>
          </TouchableOpacity>
        </View>

        {addingOwner && (
          <View style={styles.addOwnerContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="New owner name"
              placeholderTextColor={colors.textSecondary}
              value={newOwnerName}
              onChangeText={setNewOwnerName}
              autoCapitalize="words"
            />
            <TouchableOpacity style={[styles.addOwnerBtn, { backgroundColor: colors.primary }]} onPress={handleAddOwner}>
              <Text style={[styles.addOwnerBtnText, { color: colors.surface }]}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelOwnerBtn, { backgroundColor: colors.border }]} onPress={() => setAddingOwner(false)}>
              <Text style={[styles.cancelOwnerBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottles — scan → enter serial in modal → Add → scan next */}
      <View style={styles.section}>
        <Text style={[styles.subsectionLabel, { color: colors.textSecondary, marginBottom: 12 }]}>
          Add bottles · {pendingBottles.length} in list
        </Text>
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setScannerVisible(true)}
        >
          <Ionicons name="barcode-outline" size={22} color={colors.surface} />
          <Text style={[styles.scanButtonText, { color: colors.surface }]}>Scan barcode</Text>
        </TouchableOpacity>
        {pendingBottles.length > 0 && (
          <View style={styles.bottleList}>
            {pendingBottles.map((row) => (
              <View key={row.id} style={[styles.bottleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.bottleRowBarcode, { color: colors.text }]} numberOfLines={1}>{row.barcode}</Text>
                <Text style={[styles.bottleRowSerial, { color: colors.textSecondary }]} numberOfLines={1}>{row.serial || '—'}</Text>
                <TouchableOpacity
                  style={[styles.removeRowButton, { backgroundColor: colors.border }]}
                  onPress={() => removePendingRow(row.id)}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Error and Success Messages */}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {success ? <Text style={[styles.success, { color: colors.success }]}>{success}</Text> : null}
      
      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity 
          style={[
            styles.submitBtn, 
            { backgroundColor: colors.primary },
            (loading || loadingGasTypes || loadingLocations || gasTypes.length === 0 || locations.length === 0 || pendingBottles.length === 0) && { backgroundColor: colors.border }
          ]} 
          onPress={handleSubmit} 
          disabled={loading || loadingGasTypes || loadingLocations || gasTypes.length === 0 || locations.length === 0 || pendingBottles.length === 0}
        >
          {loading ? <ActivityIndicator color={colors.surface} /> : (
            <Text style={[styles.submitBtnText, { color: colors.surface }]}>
              Add {Math.max(1, pendingBottles.length)} {assetConfig?.assetDisplayName || 'Cylinder'}(s)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>

      {/* Scanner Modal */}
      <Modal
        visible={scannerVisible}
        onRequestClose={() => setScannerVisible(false)}
        animationType="slide"
        transparent={false}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <ScanArea
            searchCustomerByName={searchCustomerByName}
            onCustomerFound={handleOcrCustomerFound}
            onScanned={(data: string) => {
              if (data) setScannedBarcode(data);
            }}
            onClose={() => setScannerVisible(false)}
            label="Scan barcode — then add serial and tap Add"
            validationPattern={/^[\dA-Za-z\-%]+$/}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

      {/* Serial number modal — after scan, enter serial then Add → scan next */}
      <Modal
        visible={showSerialModal}
        onRequestClose={() => { setShowSerialModal(false); setCurrentBarcode(''); setCurrentSerial(''); }}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.serialModalOverlay}>
          <View style={[styles.serialModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.serialModalTitle, { color: colors.text }]}>Enter serial number</Text>
            <Text style={[styles.serialModalBarcode, { color: colors.textSecondary }]}>{currentBarcode}</Text>
            <TextInput
              style={[styles.input, styles.serialModalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Serial (optional)"
              placeholderTextColor={colors.textSecondary}
              value={currentSerial}
              onChangeText={setCurrentSerial}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.serialModalButtons}>
              <TouchableOpacity
                style={[styles.serialModalBtn, { backgroundColor: colors.border }]}
                onPress={() => { setShowSerialModal(false); setCurrentBarcode(''); setCurrentSerial(''); }}
              >
                <Text style={[styles.serialModalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.serialModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddFromSerialModal}
              >
                <Text style={[styles.serialModalBtnText, { color: colors.surface }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={locationPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLocationPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setLocationPickerVisible(false)}>
                <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalScroll}>
              {locations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.pickerModalItem,
                    { borderBottomColor: colors.border },
                    selectedLocation === location.id && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedLocation(location.id);
                    setLocationPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                    {location.name}
                  </Text>
                  {selectedLocation === location.id && (
                    <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Owner Picker Modal */}
      <Modal
        visible={ownerPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOwnerPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Owner</Text>
              <TouchableOpacity onPress={() => setOwnerPickerVisible(false)}>
                <Text style={[styles.pickerModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalScroll}>
              {owners.map(owner => (
                <TouchableOpacity
                  key={owner.id}
                  style={[
                    styles.pickerModalItem,
                    { borderBottomColor: colors.border },
                    selectedOwner === owner.name && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedOwner(owner.name);
                    setOwnerPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerModalItemText, { color: colors.text }]}>
                    {owner.name}
                  </Text>
                  {selectedOwner === owner.name && (
                    <Text style={[styles.pickerModalCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.pickerModalItem, { borderBottomColor: colors.border, borderTopWidth: 2, borderTopColor: colors.border }]}
                onPress={() => {
                  setOwnerPickerVisible(false);
                  setAddingOwner(true);
                }}
              >
                <Text style={[styles.pickerModalItemText, { color: colors.primary, fontWeight: 'bold' }]}>
                  + Add new owner...
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  gasTypeSearchWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  gasTypeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gasTypeInput: {
    zIndex: 1,
    borderWidth: 0,
    borderRadius: 0,
    marginRight: 0,
  },
  searchClearBtn: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serialModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  serialModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  serialModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  serialModalBarcode: {
    fontSize: 14,
    marginBottom: 16,
  },
  serialModalInput: {
    marginBottom: 20,
  },
  serialModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  serialModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  serialModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottleList: {
    gap: 10,
  },
  bottleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  bottleRowBarcode: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  bottleRowSerial: {
    width: 90,
    fontSize: 14,
  },
  removeRowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 280,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  suggestionEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  suggestionEmptyText: {
    fontSize: 14,
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    height: 56,
  },
  picker: {
    width: '100%',
    height: 56,
  },
  pickerButton: {
    borderRadius: 12,
    borderWidth: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  pickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  pickerModal: {
    width: '100%',
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerModalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalScroll: {
    maxHeight: '100%',
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerModalItemText: {
    fontSize: 16,
    flex: 1,
  },
  pickerModalCheck: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  loadingText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  scanButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scanButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  scanSuccess: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  addOwnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  addOwnerBtn: {
    borderRadius: 8,
    padding: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  addOwnerBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelOwnerBtn: {
    borderRadius: 8,
    padding: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  cancelOwnerBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitContainer: {
    marginTop: 24,
  },
  submitBtn: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  success: {
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalCloseBtn: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
}); 