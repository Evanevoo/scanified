import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Cylinders from './pages/Cylinders';
import Rentals from './pages/Rentals';
import Invoices from './pages/Invoices';

// Placeholder components
const NotFound = () => <div>404 Not Found</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navbar />
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Navbar />
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cylinders"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Navbar />
                <Cylinders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rentals"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Navbar />
                <Rentals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Navbar />
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App; 