import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function RentalPricingManagerPlain() {
  const { organization } = useAuth();
  const [pricingTiers, setPricingTiers] = useState([]);
  const [customerRates, setCustomerRates] = useState([]);
  const [demurrageRules, setDemurrageRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (organization?.id) {
      loadPricingData();
    }
  }, [organization]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading pricing data for organization:', organization.id);
      
      // Load pricing tiers
      const { data: tiers, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('min_quantity');
      
      console.log('Pricing tiers result:', { tiers, tiersError });
      
      // Load customer rates
      const { data: rates, error: ratesError } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id);
      
      console.log('Customer rates result:', { rates, ratesError });
      
      // Load demurrage rules
      const { data: demurrage, error: demurrageError } = await supabase
        .from('demurrage_rules')
        .select('*')
        .eq('organization_id', organization.id)
        .order('grace_period_days');

      console.log('Demurrage rules result:', { demurrage, demurrageError });

      setPricingTiers(tiers || []);
      setCustomerRates(rates || []);
      setDemurrageRules(demurrage || []);
      
      if (tiersError || ratesError || demurrageError) {
        setError('Some data could not be loaded. Check console for details.');
      }
    } catch (error) {
      console.error('Error loading pricing data:', error);
      setError(error.message);
      setPricingTiers([]);
      setCustomerRates([]);
      setDemurrageRules([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading pricing data...</h2>
      </div>
    );
  }

  if (!organization) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Warning</h2>
        <p>Please connect to an organization to access the rental pricing manager.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Error</h2>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={loadPricingData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Rental Pricing Manager (Plain HTML)</h1>
      <p>Configure advanced pricing rules, demurrage calculations, and customer-specific rates</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Overview</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <strong>{pricingTiers.length}</strong> Pricing Tiers
          </div>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <strong>{customerRates.length}</strong> Custom Rates
          </div>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <strong>{demurrageRules.length}</strong> Demurrage Rules
          </div>
        </div>
      </div>

      <div>
        <h3>Pricing Tiers</h3>
        {pricingTiers.length === 0 ? (
          <p>No pricing tiers configured. Add your first tier to enable bracket-based pricing.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Tier Name</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Gas Type</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Min Quantity</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Daily Rate</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Weekly Rate</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Monthly Rate</th>
              </tr>
            </thead>
            <tbody>
              {pricingTiers.map((tier) => (
                <tr key={tier.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{tier.name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{tier.gas_type}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{tier.min_quantity}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>${tier.daily_rate}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>${tier.weekly_rate}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>${tier.monthly_rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Debug Info</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify({
            organization: organization?.id,
            pricingTiers: pricingTiers.length,
            customerRates: customerRates.length,
            demurrageRules: demurrageRules.length,
            timestamp: new Date().toISOString()
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
