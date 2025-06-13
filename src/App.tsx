import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ImportApprovals from './pages/ImportApprovals';
import ImportApprovalDetail from './pages/ImportApprovalDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/import-approvals" element={<ImportApprovals />} />
        <Route path="/import-approval/:invoiceNumber/detail" element={<ImportApprovalDetail />} />
        {/* Catch-all route */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 