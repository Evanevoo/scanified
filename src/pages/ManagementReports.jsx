import React from 'react';
import { Outlet } from 'react-router-dom';
import ManagementReportsSidebar from '../components/ManagementReportsSidebar';

export default function ManagementReports() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ManagementReportsSidebar />
      <div className="flex-1 p-8">
        <Outlet />
      </div>
    </div>
  );
} 