import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';

function Rentals({ profile }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [showEndRentalModal, setShowEndRentalModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [endDate, setEndDate] = useState('');

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';
  const navigate = useNavigate();

  // Fetch rentals with customer and cylinder details
  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rentalsError } = await supabase
          .from('rentals')
          .select(`
            *,
            customer:customer_id (
              CustomerListID,
              name,
              customer_number
            ),
            cylinder:cylinder_id (
              id,
              serial_number,
              gas_type
            )
          `)
          .eq('status', statusFilter)
          .order('rental_start_date', { ascending: false });

        if (rentalsError) throw rentalsError;
        setRentals(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchRentals();
  }, [statusFilter]);

  const openEndRentalModal = (rental) => {
    setSelectedRental(rental);
    setEndDate(new Date().toISOString().split('T')[0]);
    setShowEndRentalModal(true);
  };

  const handleEndRental = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // Update rental status
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({
          status: 'ended',
          rental_end_date: endDate
        })
        .eq('id', selectedRental.id);

      if (rentalError) throw rentalError;

      // Unassign cylinder
      const { error: cylinderError } = await supabase
        .from('cylinders')
        .update({
          assigned_customer: null,
          rental_start_date: null
        })
        .eq('id', selectedRental.cylinder.id);

      if (cylinderError) throw cylinderError;

      setShowEndRentalModal(false);
      
      // Refresh rentals list
      const { data, error: refreshError } = await supabase
        .from('rentals')
        .select(`
          *,
          customer:customer_id (
            CustomerListID,
            name,
            customer_number
          ),
          cylinder:cylinder_id (
            id,
            serial_number,
            gas_type
          )
        `)
        .eq('status', statusFilter)
        .order('rental_start_date', { ascending: false });

      if (refreshError) throw refreshError;
      setRentals(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading rentals...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="relative max-w-7xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100 w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold">Rentals</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded ${
              statusFilter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('ended')}
            className={`px-4 py-2 rounded ${
              statusFilter === 'ended'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Ended
          </button>
        </div>
      </div>

      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Customer</th>
            <th className="border px-4 py-2">Cylinder</th>
            <th className="border px-4 py-2">Gas Type</th>
            <th className="border px-4 py-2">Type</th>
            <th className="border px-4 py-2">Start Date</th>
            <th className="border px-4 py-2">End Date</th>
            {canEdit && statusFilter === 'active' && (
              <th className="border px-4 py-2">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rentals.map(rental => (
            <tr key={rental.id}>
              <td className="border px-4 py-2">
                {rental.customer.name}
                <br />
                <span className="text-sm text-gray-500">
                  ({rental.customer.customer_number})
                </span>
              </td>
              <td className="border px-4 py-2">{rental.cylinder.serial_number}</td>
              <td className="border px-4 py-2">{rental.cylinder.gas_type}</td>
              <td className="border px-4 py-2">
                <span className={`capitalize ${
                  rental.rental_type === 'monthly'
                    ? 'text-blue-600'
                    : 'text-green-600'
                }`}>
                  {rental.rental_type}
                </span>
              </td>
              <td className="border px-4 py-2">{rental.rental_start_date}</td>
              <td className="border px-4 py-2">{rental.rental_end_date || '-'}</td>
              {canEdit && statusFilter === 'active' && (
                <td className="border px-4 py-2">
                  <button
                    onClick={() => openEndRentalModal(rental)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    End Rental
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* End Rental Modal */}
      {showEndRentalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">End Rental</h3>
            <p className="mb-4">
              End rental for cylinder {selectedRental.cylinder.serial_number}
              <br />
              <span className="text-sm text-gray-600">
                Rented to: {selectedRental.customer.name}
              </span>
            </p>
            <form onSubmit={handleEndRental} className="space-y-4">
              <div>
                <label className="block mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndRentalModal(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  End Rental
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rentals; 