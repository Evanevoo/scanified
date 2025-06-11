import React, { createContext, useContext, useState, useEffect } from 'react';
import { addImportWorkerListener, removeImportWorkerListener } from '../utils/ImportWorkerManager';

const ImportProgressContext = createContext();

export function ImportProgressProvider({ children }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const [status, setStatus] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);

  useEffect(() => {
    function handleWorkerMessage(event) {
      const { type, result, progress: prog, errors: errs, status: workerStatus, total, processed } = event.data;
      
      if (type === 'batch') {
        setImporting(true);
        if (typeof prog === 'number') setProgress(prog);
        if (errs) setErrors(errs);
        if (workerStatus) setStatus(workerStatus);
        if (total) setTotalRows(total);
        if (processed) setProcessedRows(processed);
      } else if (type === 'done') {
        setImporting(false);
        setProgress(100);
        setErrors(result?.errors || []);
        setStatus('Import completed');
        setTimeout(() => {
          setProgress(0);
          setStatus('');
          setTotalRows(0);
          setProcessedRows(0);
        }, 3000);
      } else if (type === 'progress') {
        setImporting(true);
        setProgress(prog);
        if (workerStatus) setStatus(workerStatus);
        if (total) setTotalRows(total);
        if (processed) setProcessedRows(processed);
      } else if (type === 'error') {
        setImporting(false);
        setErrors([result?.error || 'Unknown error occurred']);
        setStatus('Import failed');
        setTimeout(() => {
          setProgress(0);
          setStatus('');
          setErrors([]);
          setTotalRows(0);
          setProcessedRows(0);
        }, 5000);
      }
    }
    
    addImportWorkerListener(handleWorkerMessage);
    return () => removeImportWorkerListener(handleWorkerMessage);
  }, []);

  return (
    <ImportProgressContext.Provider value={{ 
      importing, 
      progress, 
      errors, 
      status, 
      totalRows, 
      processedRows 
    }}>
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  return useContext(ImportProgressContext);
} 