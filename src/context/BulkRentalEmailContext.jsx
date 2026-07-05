import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import {
  createBulkEmailJobController,
  runBulkRentalInvoiceEmailJob,
} from '../services/bulkRentalInvoiceEmailJob';

const BulkRentalEmailContext = createContext(null);

const IDLE_PROGRESS = {
  sent: 0,
  failed: 0,
  total: 0,
  currentCustomerName: '',
  index: 0,
};

export function BulkRentalEmailProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(IDLE_PROGRESS);
  const [skippedNoEmail, setSkippedNoEmail] = useState(0);
  const [resultSummary, setResultSummary] = useState('');
  const controllerRef = useRef(null);
  const runningRef = useRef(false);

  const active = status === 'running' || status === 'paused';

  const dismiss = useCallback(() => {
    if (active) return;
    setStatus('idle');
    setProgress(IDLE_PROGRESS);
    setSkippedNoEmail(0);
    setResultSummary('');
  }, [active]);

  const pauseJob = useCallback(() => {
    if (!controllerRef.current || status !== 'running') return;
    controllerRef.current.paused = true;
    setStatus('paused');
  }, [status]);

  const resumeJob = useCallback(() => {
    if (!controllerRef.current || status !== 'paused') return;
    controllerRef.current.paused = false;
    setStatus('running');
  }, [status]);

  const cancelJob = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.cancelled = true;
    controllerRef.current.paused = false;
    if (status === 'paused') {
      setStatus('running');
    }
  }, [status]);

  const startJob = useCallback(async ({ items, deps, skippedNoEmail: skipped = 0, onComplete }) => {
    if (runningRef.current) {
      toast.error('A bulk email job is already running.');
      return false;
    }

    const toSend = (items || []).filter((i) => i.willSend);
    if (toSend.length === 0) {
      toast.error('No customers with an email address to send to.');
      return false;
    }

    runningRef.current = true;
    const controller = createBulkEmailJobController();
    controllerRef.current = controller;
    setSkippedNoEmail(skipped);
    setResultSummary('');
    setProgress({
      sent: 0,
      failed: 0,
      total: toSend.length,
      currentCustomerName: '',
      index: 0,
    });
    setStatus('running');

    try {
      const result = await runBulkRentalInvoiceEmailJob({
        items,
        controller,
        onProgress: (p) => setProgress(p),
        deps,
      });

      const parts = [];
      if (result.cancelled) {
        parts.push(`Stopped after ${result.sent}/${result.total} emailed`);
        if (result.failed > 0) parts.push(`${result.failed} email error(s)`);
        setResultSummary(parts.join('. '));
        setStatus('cancelled');
        toast(`Bulk email cancelled. ${parts.join('. ')}.`, { icon: '⏹' });
      } else {
        parts.push(`Emailed ${result.sent}/${result.total} customers`);
        if (result.failed > 0) parts.push(`${result.failed} email send error(s)`);
        if (skipped > 0) parts.push(`${skipped} skipped in preview (no email on file)`);
        if (result.pdfArchiveFailed > 0) {
          parts.push(
            `${result.pdfArchiveFailed} PDF archive failed (emails were still sent — run sql/create_invoices_storage_bucket.sql)`,
          );
        }
        setResultSummary(parts.join('. '));
        setStatus('completed');
        if (result.failed > 0 || skipped > 0 || result.pdfArchiveFailed > 0) {
          toast.error(parts.join('. '));
        } else {
          toast.success(`Emailed ${result.sent}/${result.total} invoices successfully.`);
        }
      }

      if (typeof onComplete === 'function') {
        onComplete(result, { skippedNoEmail: skipped });
      }
      return true;
    } catch (err) {
      setStatus('completed');
      const msg = err?.message || 'Bulk email failed.';
      setResultSummary(msg);
      toast.error(msg);
      return false;
    } finally {
      runningRef.current = false;
      controllerRef.current = null;
    }
  }, []);

  const value = useMemo(
    () => ({
      active,
      status,
      progress,
      skippedNoEmail,
      resultSummary,
      startJob,
      pauseJob,
      resumeJob,
      cancelJob,
      dismiss,
    }),
    [
      active,
      status,
      progress,
      skippedNoEmail,
      resultSummary,
      startJob,
      pauseJob,
      resumeJob,
      cancelJob,
      dismiss,
    ],
  );

  return (
    <BulkRentalEmailContext.Provider value={value}>
      {children}
    </BulkRentalEmailContext.Provider>
  );
}

export function useBulkRentalEmail() {
  const ctx = useContext(BulkRentalEmailContext);
  if (!ctx) {
    throw new Error('useBulkRentalEmail must be used inside BulkRentalEmailProvider');
  }
  return ctx;
}
