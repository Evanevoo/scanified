import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ImportApprovals from './pages/ImportApprovals';
import ImportApprovalDetail from './pages/ImportApprovalDetail';
import InvoiceDetail from './pages/InvoiceDetail';
import ImportApprovalsHistory from './pages/ImportApprovalsHistory';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home profile={{ full_name: 'User', role: 'admin' }} />} />
        <Route path="/import-approvals" element={<ImportApprovals />} />
        <Route path="/import-approval/:invoiceNumber/detail" element={<ImportApprovalDetail />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/history" element={<ImportApprovalsHistory />} />
        {/* Catch-all route */}
        <Route path="*" element={<Home profile={{ full_name: 'User', role: 'admin' }} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 