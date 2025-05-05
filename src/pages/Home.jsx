import React from 'react';
import Navbar from '../components/Navbar';
import EnvTest from '../components/EnvTest';
import Sidebar from '../components/Sidebar';

export default function Home({ profile }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-white/80 shadow-2xl rounded-2xl p-8 border border-blue-100 mb-8">
            <h1 className="text-4xl font-extrabold mb-4 text-blue-900 tracking-tight flex items-center gap-3">
              <svg xmlns='http://www.w3.org/2000/svg' className='h-8 w-8 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 7v4a1 1 0 001 1h3m10-5h3a1 1 0 011 1v4a1 1 0 01-1 1h-3m-10 4h10m-10 4h10' /></svg>
              Dashboard
            </h1>
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-1 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl p-6 shadow flex items-center gap-4">
                <svg xmlns='http://www.w3.org/2000/svg' className='h-8 w-8 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
                <div>
                  <div className="text-lg font-bold text-blue-900">{profile?.full_name || 'User'}</div>
                  <div className="text-xs text-blue-700">Logged in</div>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl p-6 shadow flex items-center gap-4">
                <svg xmlns='http://www.w3.org/2000/svg' className='h-8 w-8 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 01-8 0m8 0a4 4 0 00-8 0m8 0V5a4 4 0 00-8 0v2m8 0a4 4 0 01-8 0' /></svg>
                <div>
                  <div className="text-lg font-bold text-blue-900 capitalize">{profile?.role}</div>
                  <div className="text-xs text-blue-700">Role</div>
                </div>
              </div>
            </div>
            {profile?.role === 'admin' && <p className="text-green-700 font-semibold mb-2">You have full access to all features.</p>}
            {profile?.role === 'manager' && <p className="text-blue-700 font-semibold mb-2">You can view, assign cylinders, and generate invoices.</p>}
            {profile?.role === 'user' && <p className="text-gray-700 font-semibold mb-2">You have view-only access to customers and assigned cylinders.</p>}
            <p className="mt-6 text-blue-900">Use the navigation bar to manage customers, cylinders, rentals, and invoices.</p>
            {/* Environment Variables Test */}
            {profile?.role === 'admin' && <div className="mt-8"><EnvTest /></div>}
          </div>
        </div>
      </div>
    </div>
  );
} 