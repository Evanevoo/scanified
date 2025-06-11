import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ImportFills() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = e => setFile(e.target.files[0]);

  const handleImport = e => {
    e.preventDefault();
    // Simulate import result
    setResult({ success: true, imported: 100, errors: 0 });
  };

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Import Fills</h2>
      <form onSubmit={handleImport} className="mb-6 flex gap-2 items-end">
        <input type="file" accept=".pdf,.csv,.xlsx,.xls,.txt" onChange={handleFileChange} className="border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={!file}>Import</button>
      </form>
      {result && (
        <div className="bg-green-100 text-green-800 p-4 rounded">
          Import finished! Imported: {result.imported}, Errors: {result.errors}
        </div>
      )}
    </div>
  );
} 