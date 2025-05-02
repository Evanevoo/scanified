import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { generateInvoicePDF, calculateRentalAmount } from '../utils/pdfGenerator';

function Invoices({ profile }) {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [generating, setGenerating] = useState(false);

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
              id,
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
        .eq('id', customerId)
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
            id,
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
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Invoices</h2>
        {canGenerate && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
              disabled={generating}
            >
              Generate Invoice
            </button>
            <button
              onClick={handleBulkGenerate}
              className="bg-green-600 text-white px-4 py-2 rounded"
              disabled={generating}
            >
              Bulk Generate
            </button>
          </div>
        )}
      </div>

      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Invoice #</th>
            <th className="border px-4 py-2">Customer</th>
            <th className="border px-4 py-2">Date</th>
            <th className="border px-4 py-2">Amount</th>
            <th className="border px-4 py-2">Generated By</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <tr key={invoice.id}>
              <td className="border px-4 py-2">{invoice.id}</td>
              <td className="border px-4 py-2">
                {invoice.customer.name}
                <br />
                <span className="text-sm text-gray-500">
                  ({invoice.customer.customer_number})
                </span>
              </td>
              <td className="border px-4 py-2">{invoice.invoice_date}</td>
              <td className="border px-4 py-2">${invoice.amount.toFixed(2)}</td>
              <td className="border px-4 py-2">{invoice.generated_by_user?.full_name}</td>
              <td className="border px-4 py-2">
                <a
                  href={invoice.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Download PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
                    <option key={customer.id} value={customer.id}>
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