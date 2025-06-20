import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

export default function ReviewScreen({ navigation, route }) {
  const { orderNumber, cylinders } = route?.params || {};
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [matchResults, setMatchResults] = useState([]);

  useEffect(() => {
    async function checkMatches() {
      if (!orderNumber || !cylinders.length) return;
      // 1. Fetch all line items for this order (invoice)
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('details', orderNumber)
        .single();
      if (!invoice) {
        setMatchResults(cylinders.map(barcode => ({ barcode, match: false, reason: 'Order not found' })));
        return;
      }
      const { data: lineItems = [] } = await supabase
        .from('invoice_line_items')
        .select('product_code')
        .eq('invoice_id', invoice.id);
      const expectedCodes = new Set((lineItems || []).map(li => (li.product_code || '').trim().toLowerCase()));
      // 2. For each scanned barcode, fetch the cylinder and check product_code
      const results = [];
      for (const barcode of cylinders) {
        const { data: cylinder } = await supabase
          .from('cylinders')
          .select('product_code, type')
          .eq('barcode_number', barcode)
          .single();
        if (!cylinder) {
          results.push({ barcode, match: false, reason: 'Barcode not found' });
        } else if (expectedCodes.has((cylinder.product_code || '').trim().toLowerCase()) || expectedCodes.has((cylinder.type || '').trim().toLowerCase())) {
          results.push({ barcode, match: true });
        } else {
          results.push({ barcode, match: false, reason: 'Item not on invoice' });
        }
      }
      setMatchResults(results);
    }
    checkMatches();
    // eslint-disable-next-line
  }, [orderNumber, cylinders]);

  const handleSync = async () => {
    setLoading(true);
    // Adjust table/columns as needed
    const { error } = await supabase.from('scanned_cylinders').insert(
      cylinders.map((cylinder) => ({
        order_number: orderNumber,
        cylinder_barcode: cylinder,
      }))
    );
    setLoading(false);
    if (error) setResult('Error: ' + error.message);
    else setResult('Synced successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span>Order/Customer: {orderNumber}</span>
      <ul>
        {cylinders.map((c, idx) => (
          <li key={c + idx}>{c}</li>
        ))}
      </ul>
      {/* Match Results */}
      {matchResults.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>Match Results:</strong>
          <ul>
            {matchResults.map((res, idx) => (
              <li key={res.barcode + idx} style={{ color: res.match ? 'green' : 'red' }}>
                <a href={`/bottles/${res.barcode}`} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}>{res.barcode}</a>
                {res.barcode}: {res.match ? 'MATCH' : `NO MATCH${res.reason ? ' (' + res.reason + ')' : ''}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={handleSync} disabled={loading}>Sync to Server</button>
      {result ? <span>{result}</span> : null}
      <button onClick={() => navigation.popToTop()}>Back to Start</button>
    </div>
  );
} 