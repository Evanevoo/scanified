import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function RentalInvoiceSearch() {
  const navigate = useNavigate();
  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <h2 className="text-2xl font-bold mb-4">Rental Invoice Search</h2>
      <div>Rental Invoice Search content goes here.</div>
    </div>
  );
} 