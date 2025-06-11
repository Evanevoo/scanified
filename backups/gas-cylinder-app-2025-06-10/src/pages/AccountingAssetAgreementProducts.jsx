import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccountingAssetAgreementProducts() {
  const navigate = useNavigate();
  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Accounting Asset Agreement Products</h2>
      <div>Accounting Asset Agreement Products content goes here.</div>
    </div>
  );
} 