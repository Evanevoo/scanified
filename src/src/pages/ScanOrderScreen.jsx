import React, { useState } from 'react';

export default function ScanOrderScreen({ navigation }) {
  const [orderNumber, setOrderNumber] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span>Enter or scan Sales Order/Customer Number:</span>
      <input
        placeholder="Order or Customer Number"
        value={orderNumber}
        onChange={e => setOrderNumber(e.target.value)}
      />
      <button
        onClick={() => navigation.navigate('ScanCylinders', { orderNumber })}
        disabled={!orderNumber}
      >
        Next: Scan Cylinders
      </button>
    </div>
  );
} 