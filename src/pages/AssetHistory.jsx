import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';

export default function AssetHistory() {
  const { id } = useParams(); // id can be barcode or serial number
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [recordEditId, setRecordEditId] = useState(null);
  const [recordEditForm, setRecordEditForm] = useState({});

  // Asset lookup by barcode or serial number
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to find asset by barcode or serial_number
        const { data: assetData, error: assetError } = await supabase
          .from('bottles')
          .select('*')
          .or(`barcode_number.eq.${id},serial_number.eq.${id}`)
          .single();
        if (assetError || !assetData) throw new Error('Asset not found.');
        setAsset(assetData);
        setEditForm(assetData);
        // Fetch asset history/records (simulate with a table 'asset_records' or use mock data)
        const { data: recordsData, error: recordsError } = await supabase
          .from('asset_records')
          .select('*')
          .eq('asset_id', assetData.id)
          .order('created_at', { ascending: false });
        setRecords(recordsData || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Asset edit handlers
  const handleAssetEdit = () => setEditMode(true);
  const handleAssetEditChange = e => setEditForm({ ...editForm, [e.target.name]: e.target.value });
  const handleAssetEditSave = async () => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.from('bottles').update(editForm).eq('id', asset.id);
    if (updateError) setError(updateError.message);
    else {
      setAsset(editForm);
      setEditMode(false);
    }
    setLoading(false);
  };

  // Record edit handlers
  const handleRecordEdit = (record) => {
    setRecordEditId(record.id);
    setRecordEditForm(record);
  };
  const handleRecordEditChange = e => setRecordEditForm({ ...recordEditForm, [e.target.name]: e.target.value });
  const handleRecordEditSave = async () => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.from('asset_records').update(recordEditForm).eq('id', recordEditId);
    if (updateError) setError(updateError.message);
    else {
      setRecords(records.map(r => r.id === recordEditId ? recordEditForm : r));
      setRecordEditId(null);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!asset) return <div>Asset not found.</div>;

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100 w-full">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Asset History</h2>
      {/* Asset Overview */}
      <div className="mb-6 p-4 bg-white/80 rounded-xl shadow border border-blue-100">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold text-blue-900 text-lg">{asset.description || 'Asset'}</div>
          {!editMode && <button onClick={handleAssetEdit} className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded shadow hover:bg-yellow-500">Edit Asset</button>}
        </div>
        {editMode ? (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input name="barcode_number" value={editForm.barcode_number || ''} onChange={handleAssetEditChange} placeholder="Barcode" className="border p-2 rounded" />
            <input name="serial_number" value={editForm.serial_number || ''} onChange={handleAssetEditChange} placeholder="Serial Number" className="border p-2 rounded" />
            <input name="category" value={editForm.category || ''} onChange={handleAssetEditChange} placeholder="Category" className="border p-2 rounded" />
            <input name="group_name" value={editForm.group_name || ''} onChange={handleAssetEditChange} placeholder="Group" className="border p-2 rounded" />
            <input name="type" value={editForm.type || ''} onChange={handleAssetEditChange} placeholder="Type" className="border p-2 rounded" />
            <input name="description" value={editForm.description || ''} onChange={handleAssetEditChange} placeholder="Description" className="border p-2 rounded" />
            <input name="gas_type" value={editForm.gas_type || ''} onChange={handleAssetEditChange} placeholder="Gas Type" className="border p-2 rounded" />
            <input name="dock_stock" value={editForm.dock_stock || ''} onChange={handleAssetEditChange} placeholder="Dock Stock" className="border p-2 rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><b>Barcode:</b> {asset.barcode_number ? (
              <Link
                to={`/bottle/${asset.id}`}
                style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
              >
                {asset.barcode_number}
              </Link>
            ) : ''}</div>
            <div><b>Serial Number:</b> {asset.serial_number}</div>
            <div><b>Category:</b> {asset.category}</div>
            <div><b>Group:</b> {asset.group_name}</div>
            <div><b>Type:</b> {asset.type}</div>
            <div><b>Description:</b> {asset.description}</div>
            <div><b>Gas Type:</b> {asset.gas_type}</div>
            <div><b>Dock Stock:</b> {asset.dock_stock}</div>
            <div><b>Status:</b> {asset.status || '-'}</div>
            <div><b>Use State:</b> {asset.use_state || '-'}</div>
          </div>
        )}
        {editMode && (
          <div className="flex gap-2 mt-2">
            <button onClick={handleAssetEditSave} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            <button onClick={() => { setEditMode(false); setEditForm(asset); }} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
          </div>
        )}
      </div>
      {/* Asset Record Log */}
      <h3 className="font-bold mb-2 text-blue-800">Asset Record Log</h3>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search records by type, user, location, notes..."
          className="border p-2 rounded w-80"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border text-xs">
          <thead>
            <tr>
              <th>Type</th>
              <th>Created</th>
              <th>Submitted</th>
              <th>User</th>
              <th>Device</th>
              <th>Location</th>
              <th>Data</th>
              <th>Associated Assets</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.filter(r =>
              !searchTerm ||
              r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(record => (
              <tr key={record.id} className={recordEditId === record.id ? 'bg-yellow-100' : ''}>
                {recordEditId === record.id ? (
                  <>
                    <td><input name="type" value={recordEditForm.type || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td>{recordEditForm.created_at}</td>
                    <td>{recordEditForm.submitted_at}</td>
                    <td><input name="user" value={recordEditForm.user || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td><input name="device" value={recordEditForm.device || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td><input name="location" value={recordEditForm.location || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td><input name="data" value={recordEditForm.data || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td><input name="associated_assets" value={recordEditForm.associated_assets || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td><input name="notes" value={recordEditForm.notes || ''} onChange={handleRecordEditChange} className="border p-1 rounded w-24" /></td>
                    <td>
                      <button onClick={handleRecordEditSave} className="bg-blue-600 text-white px-2 py-1 rounded mr-1">Save</button>
                      <button onClick={() => setRecordEditId(null)} className="bg-gray-400 text-white px-2 py-1 rounded">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{record.type}</td>
                    <td>{record.created_at}</td>
                    <td>{record.submitted_at}</td>
                    <td>{record.user}</td>
                    <td>{record.device}</td>
                    <td>{record.location}</td>
                    <td>{record.data}</td>
                    <td>{record.associated_assets}</td>
                    <td>{record.notes}</td>
                    <td>
                      <button onClick={() => handleRecordEdit(record)} className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded">Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 