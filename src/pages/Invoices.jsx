import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { exportToExcel } from '../utils/fileImport';

const Invoices = () => {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [rentalType, setRentalType] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cust, inv, rent] = await Promise.all([
      supabase.from('customers').select('id, name'),
      supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
      supabase.from('rentals').select('*').eq('status', 'active'),
    ]);
    setCustomers(cust.data || []);
    setInvoices(inv.data || []);
    setRentals(rent.data || []);
    setLoading(false);
  };

  const handleGenerate = async (bulk = false) => {
    setGenerating(true);
    setError('');
    let targets = bulk ? customers : customers.filter(c => c.id === selectedCustomer);
    if (targets.length === 0) {
      setError('No customers selected.');
      setGenerating(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const newInvoices = [];
    for (const customer of targets) {
      // Find active rentals for this customer and rental type
      const custRentals = rentals.filter(r => r.customer_id === customer.id && r.rental_type === rentalType);
      if (custRentals.length === 0) continue;
      // Calculate amount (for demo: $10/month, $100/year per rental)
      const amount = rentalType === 'monthly' ? custRentals.length * 10 : custRentals.length * 100;
      newInvoices.push({
        customer_id: customer.id,
        rental_id: custRentals[0].id, // just link to one rental for simplicity
        invoice_date: today,
        amount,
        details: `${custRentals.length} ${rentalType} rental(s)`
      });
    }
    if (newInvoices.length === 0) {
      setError('No active rentals found for selected customer(s) and rental type.');
      setGenerating(false);
      return;
    }
    await supabase.from('invoices').insert(newInvoices);
    setGenerating(false);
    fetchData();
  };

  const handleExport = () => {
    exportToExcel(invoices, 'invoices.xlsx');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-bold mb-2">Generate Invoice</h2>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="border px-3 py-2 rounded">
            <option value="">-- Select Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={rentalType} onChange={e => setRentalType(e.target.value)} className="border px-3 py-2 rounded">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button
            onClick={() => handleGenerate(false)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={generating || !selectedCustomer}
          >
            Generate for Customer
          </button>
          <button
            onClick={() => handleGenerate(true)}
            className="bg-green-600 text-white px-4 py-2 rounded"
            disabled={generating}
          >
            Generate for All
          </button>
          <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded">Export</button>
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      </div>
      <h2 className="font-bold mb-2">Invoice History</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Date</th>
                <th className="py-2 px-4 border-b">Customer</th>
                <th className="py-2 px-4 border-b">Amount</th>
                <th className="py-2 px-4 border-b">Details</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="py-2 px-4 border-b">{inv.invoice_date}</td>
                  <td className="py-2 px-4 border-b">{getCustomerName(customers, inv.customer_id)}</td>
                  <td className="py-2 px-4 border-b">${inv.amount}</td>
                  <td className="py-2 px-4 border-b">{inv.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function getCustomerName(customers, id) {
  if (!id) return '';
  const c = customers.find(c => c.id === id);
  return c ? c.name : '';
}

export default Invoices; 