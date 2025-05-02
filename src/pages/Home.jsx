import React from 'react';
import Navbar from '../components/Navbar';
import EnvTest from '../components/EnvTest';
import Sidebar from '../components/Sidebar';

export default function Home({ profile }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <p className="mb-2">Welcome, <span className="font-semibold">{profile?.full_name || 'User'}</span>!</p>
          <p className="mb-4">Your role: <span className="font-semibold">{profile?.role}</span></p>
          {profile?.role === 'admin' && <p className="text-green-700">You have full access to all features.</p>}
          {profile?.role === 'manager' && <p className="text-blue-700">You can view, assign cylinders, and generate invoices.</p>}
          {profile?.role === 'user' && <p className="text-gray-700">You have view-only access to customers and assigned cylinders.</p>}
          <p className="mt-6">Use the navigation bar to manage customers, cylinders, rentals, and invoices.</p>
          {/* Environment Variables Test */}
          {profile?.role === 'admin' && <EnvTest />}
        </div>
      </div>
    </div>
  );
} 