import React, { useState, useEffect } from 'react';
// Note: For a real mobile app, use expo-barcode-scanner. Here, we use a placeholder for the scanner.

export default function ScanCylindersScreen({ navigation, route }) {
  const { orderNumber } = route?.params || {};
  const [cylinders, setCylinders] = useState([]);
  const [barcode, setBarcode] = useState('');

  // Placeholder for barcode scanning. In Expo, use BarCodeScanner component.
  const handleAddBarcode = () => {
    if (barcode && !cylinders.includes(barcode)) {
      setCylinders([...cylinders, barcode]);
      setBarcode('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span>Order/Customer: {orderNumber}</span>
      <input
        placeholder="Scan or enter cylinder barcode"
        value={barcode}
        onChange={e => setBarcode(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAddBarcode()}
      />
      <button onClick={handleAddBarcode} disabled={!barcode}>Add Cylinder</button>
      <ul>
        {cylinders.map((c, idx) => (
          <li key={c + idx}>{c}</li>
        ))}
      </ul>
      <button
        onClick={() => navigation.navigate('Review', { orderNumber, cylinders })}
        disabled={cylinders.length === 0}
      >
        Review & Sync
      </button>
    </div>
  );
} 