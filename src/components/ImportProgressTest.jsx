import React, { useEffect } from 'react';
import { getImportWorker } from '../utils/ImportWorkerManager';

export default function ImportProgressTest() {
  useEffect(() => {
    const worker = getImportWorker();
    
    const handleWorkerMessage = (event) => {
      const { type, batchId, start } = event.data;
      
      if (type === 'batch') {
        // Simulate processing the batch
        setTimeout(() => {
          worker.postMessage({
            type: 'batchResult',
            data: {
              nextIndex: start + 50, // Process 50 rows at a time
              errors: [] // No errors for test
            }
          });
        }, 200); // 200ms delay to simulate processing
      }
    };
    
    worker.addEventListener('message', handleWorkerMessage);
    
    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, []);

  const startTestImport = () => {
    const worker = getImportWorker();
    
    // Create test data
    const testRows = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      customer_id: `CUST${Math.floor(i / 10) + 1}`,
      customer_name: `Customer ${Math.floor(i / 10) + 1}`,
      date: '2024-01-01',
      product_code: `PROD${i % 50 + 1}`,
      qty_out: Math.floor(Math.random() * 10) + 1,
      qty_in: Math.floor(Math.random() * 5)
    }));

    // Start the worker
    worker.postMessage({
      type: 'start',
      data: {
        rows: testRows,
        batchSize: 50,
        debug: true
      }
    });
  };

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-40">
      <h3 className="font-semibold mb-2">Import Progress Test</h3>
      <button
        onClick={startTestImport}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
      >
        Start Test Import
      </button>
      <p className="text-xs text-gray-600 mt-2">
        This will simulate a 1000-row import<br />
        to test the global progress indicator.
      </p>
    </div>
  );
} 