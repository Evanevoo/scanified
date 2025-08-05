import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { supabase } from '../supabase';
import { useAssetConfig } from '../context/AssetContext';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export default function HistoryScreen() {
  const { config: assetConfig } = useAssetConfig();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editScan, setEditScan] = useState(null);
  const [editCustomer, setEditCustomer] = useState('');
  const [editAssets, setEditAssets] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true);
      setError('');
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('asset_scans')
        .select('*')
        .eq('verified', false)
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) {
        setError('Failed to load scans.');
      } else {
        setError('');
        setScans(data || []);
      }
      setLoading(false);
    };
    fetchScans();
  }, []);

  const openEdit = (scan) => {
    setEditScan(scan);
    setEditCustomer(scan.customer_name || '');
    setEditAssets(scan.assets || scan.asset_barcode ? [scan.asset_barcode] : []);
  };

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('asset_scans')
      .update({ customer_name: editCustomer, asset_barcode: editAssets[0] })
      .eq('id', editScan.id);
    setSaving(false);
    setEditScan(null);
    // Refresh list
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('asset_scans')
      .select('*')
      .eq('verified', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    setScans(data || []);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unverified Scans (Last 24h)</Text>
      {loading ? <ActivityIndicator color="#2563eb" /> : error ? <Text style={styles.error}>{error}</Text> : (
        <FlatList
          data={scans}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.scanItem} onPress={() => openEdit(item)}>
              <Text style={styles.scanBarcode}>{item.asset_barcode}</Text>
              <Text style={styles.scanCustomer}>{item.customer_name}</Text>
              <Text style={styles.scanDate}>{formatDate(item.created_at)}</Text>
              <Text style={styles.scanStatus}>Verified: {item.verified ? 'Yes' : 'No'}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!error ? <Text style={{ color: '#888', textAlign: 'center', marginTop: 24 }}>No unverified scans in the last 24 hours.</Text> : null}
        />
      )}
      {/* Edit Modal */}
      <Modal visible={!!editScan} animationType="slide" transparent onRequestClose={() => setEditScan(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Scan</Text>
            <Text style={styles.label}>Customer</Text>
            <TextInput
              style={styles.input}
              value={editCustomer}
              onChangeText={setEditCustomer}
              placeholder="Customer Name"
            />
            <Text style={styles.label}>{assetConfig?.assetDisplayName || 'Asset'} Barcode</Text>
            <TextInput
              style={styles.input}
              value={editCylinders[0] || ''}
              onChangeText={v => setEditCylinders([v])}
              placeholder={`${assetConfig?.assetDisplayName || 'Asset'} Barcode`}
            />
            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#eee', flex: 1, marginRight: 8 }]} onPress={() => setEditScan(null)}>
                <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#2563eb', flex: 1, marginLeft: 8 }]} onPress={saveEdit} disabled={saving}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{saving ? 'Saving...' : 'Save'}</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
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
  scanBarcode: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2563eb',
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
    color: '#2563eb',
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
}); 