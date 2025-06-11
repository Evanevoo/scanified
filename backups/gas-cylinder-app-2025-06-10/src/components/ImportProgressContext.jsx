import React, { createContext, useContext, useState, useEffect } from 'react';
import { addImportWorkerListener, removeImportWorkerListener } from '../utils/ImportWorkerManager';

const ImportProgressContext = createContext();

export function ImportProgressProvider({ children }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    function handleWorkerMessage(event) {
      const { type, result, progress: prog, errors: errs } = event.data;
      if (type === 'batch') {
        setImporting(true);
        if (typeof prog === 'number') setProgress(prog);
        if (errs) setErrors(errs);
      } else if (type === 'done') {
        setImporting(false);
        setProgress(100);
        setErrors(result?.errors || []);
        setTimeout(() => setProgress(0), 2000);
      } else if (type === 'progress') {
        setImporting(true);
        setProgress(prog);
      }
    }
    addImportWorkerListener(handleWorkerMessage);
    return () => removeImportWorkerListener(handleWorkerMessage);
  }, []);

  return (
    <ImportProgressContext.Provider value={{ importing, progress, errors }}>
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  return useContext(ImportProgressContext);
} 