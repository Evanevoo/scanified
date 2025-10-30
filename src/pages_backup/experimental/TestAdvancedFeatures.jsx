import logger from '../../utils/logger';
import React from 'react';

const TestAdvancedFeatures = () => {
  logger.log('TestAdvancedFeatures component is rendering');
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>
        🧪 Advanced Features Test Page
      </h1>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: '#666', fontSize: '18px', marginBottom: '10px' }}>
          Status: Page is loading correctly! ✅
        </h2>
        <p style={{ color: '#666', marginBottom: '10px' }}>
          If you can see this text, the routing is working properly.
        </p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ color: '#666', fontSize: '16px', marginBottom: '15px' }}>
          Test these URLs (use port 5174):
        </h3>
        <ul style={{ color: '#666', lineHeight: '1.6' }}>
          <li><a href="http://localhost:5174/hazmat-compliance" style={{ color: '#007bff' }}>Hazmat Compliance</a></li>
          <li><a href="http://localhost:5174/maintenance-workflows" style={{ color: '#007bff' }}>Maintenance Workflows</a></li>
          <li><a href="http://localhost:5174/truck-reconciliation" style={{ color: '#007bff' }}>Truck Reconciliation</a></li>
          <li><a href="http://localhost:5174/chain-of-custody" style={{ color: '#007bff' }}>Chain of Custody</a></li>
          <li><a href="http://localhost:5174/palletization-system" style={{ color: '#007bff' }}>Palletization System</a></li>
          <li><a href="http://localhost:5174/advanced-rental-calculations" style={{ color: '#007bff' }}>Advanced Rental Calculations</a></li>
        </ul>
      </div>
    </div>
  );
};

export default TestAdvancedFeatures; 