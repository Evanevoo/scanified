import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { generateInvoicePDF, calculateRentalAmount } from '../utils/pdfGenerator';
import { useNavigate } from 'react-router-dom';

function Invoices({ profile }) {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  const canGenerate = profile?.role === 'admin' || profile?.role === 'manager';

  // Fetch invoices and customers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch invoices with customer details
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            *,
            customer:customer_id (
              CustomerListID,
              name,
              customer_number
            ),
            generated_by_user:generated_by (
              full_name
            )
          `)
          .order('invoice_date', { ascending: false });

        if (invoicesError) throw invoicesError;

        // Fetch customers for invoice generation
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('name');

        if (customersError) throw customersError;

        setInvoices(invoicesData);
        setCustomers(customersData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleGenerateInvoice = async (customerId) => {
    setGenerating(true);
    setError(null);
    try {
      // Get customer details
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', customerId)
        .single();

      // Get active rentals for customer
      const { data: rentals } = await supabase
        .from('rentals')
        .select(`
          *,
          cylinder:cylinder_id (
            serial_number,
            gas_type
          )
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active');

      if (!rentals?.length) {
        throw new Error('No active rentals found for this customer');
      }

      // Calculate amounts for each rental
      const rentalsWithAmounts = rentals.map(rental => ({
        ...rental,
        amount: calculateRentalAmount(rental)
      }));

      // Create invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          customer_id: customerId,
          amount: rentalsWithAmounts.reduce((sum, r) => sum + r.amount, 0),
          invoice_date: new Date().toISOString().split('T')[0],
          generated_by: profile.id,
          rental_type: rentals[0].rental_type // Use first rental's type
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate PDF
      const doc = generateInvoicePDF(invoice, customer, rentalsWithAmounts);
      
      // Save PDF to Blob and create URL
      const pdfBlob = doc.output('blob');
      const fileName = `invoice_${invoice.id}_${customer.customer_number}.pdf`;
      
      // Save file URL to invoice record
      const { error: storageError } = await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBlob);

      if (storageError) throw storageError;

      // Update invoice with file URL
      const fileUrl = `${supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl}`;
      await supabase
        .from('invoices')
        .update({ file_url: fileUrl })
        .eq('id', invoice.id);

      // Refresh invoices list
      const { data: refreshedInvoices } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customer_id (
            CustomerListID,
            name,
            customer_number
          ),
          generated_by_user:generated_by (
            full_name
          )
        `)
        .order('invoice_date', { ascending: false });

      setInvoices(refreshedInvoices);
      setShowGenerateModal(false);
      
      // Open PDF in new tab
      window.open(fileUrl, '_blank');
    } catch (err) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const handleBulkGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Get all customers with active rentals
      const { data: activeRentals } = await supabase
        .from('rentals')
        .select('customer_id')
        .eq('status', 'active')
        .distinct();

      const customerIds = activeRentals.map(r => r.customer_id);
      
      // Generate invoice for each customer
      for (const customerId of customerIds) {
        await handleGenerateInvoice(customerId);
      }
    } catch (err) {
      setError(err.message);
    }
    setGenerating(false);
  };

  if (loading) return <div>Loading invoices...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">Invoices</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
        >
          Back to Dashboard
        </button>
        {canGenerate && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-5 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-500 font-semibold transition flex items-center gap-2"
              disabled={generating}
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
              Generate Invoice
            </button>
            <button
              onClick={handleBulkGenerate}
              className="bg-gradient-to-r from-green-600 to-green-400 text-white px-5 py-2 rounded-lg shadow-md hover:from-green-700 hover:to-green-500 font-semibold transition flex items-center gap-2"
              disabled={generating}
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 7h18M3 12h18M3 17h18' /></svg>
              Bulk Generate
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white/70">
        <table className="min-w-full border-separate border-spacing-0 rounded-2xl text-sm">
          <thead className="bg-gradient-to-r from-blue-200 to-blue-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="border-b px-3 py-2 font-semibold text-blue-900 text-xs tracking-wider uppercase bg-blue-50 rounded-tl-2xl">Invoice #</th>
              <th className="border-b px-3 py-2 font-semibold text-blue-900 text-xs tracking-wider uppercase">Customer</th>
              <th className="border-b px-3 py-2 font-semibold text-blue-900 text-xs tracking-wider uppercase">Amount</th>
              <th className="border-b px-3 py-2 font-semibold text-blue-900 text-xs tracking-wider uppercase">Date</th>
              <th className="border-b px-3 py-2 font-semibold text-blue-900 text-xs tracking-wider uppercase">Generated By</th>
              <th className="border-b px-3 py-2 font-semibold text-blue-900 text-xs tracking-wider uppercase rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => (
              <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white/80 hover:bg-blue-50' : 'bg-blue-50/60 hover:bg-blue-100'}>
                <td className="px-3 py-2 font-mono text-xs text-blue-800 whitespace-nowrap rounded-l-xl">{inv.id}</td>
                <td className="px-3 py-2 text-blue-900 whitespace-nowrap">{inv.customer?.name || inv.customer_id}</td>
                <td className="px-3 py-2 text-blue-900 whitespace-nowrap">${inv.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-blue-900 whitespace-nowrap">{inv.invoice_date}</td>
                <td className="px-3 py-2 text-blue-900 whitespace-nowrap">{inv.generated_by_user?.full_name || '-'}</td>
                <td className="px-3 py-2 space-x-2 rounded-r-xl flex items-center">
                  {inv.file_url && (
                    <a href={inv.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-300 text-white px-3 py-1 rounded-lg shadow hover:from-blue-600 hover:to-blue-400 transition font-semibold text-xs">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' /></svg>
                      PDF
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Generate Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.CustomerListID} value={customer.CustomerListID}>
                      {customer.name} ({customer.customer_number})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGenerateInvoice(selectedCustomer)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  disabled={!selectedCustomer || generating}
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices; 