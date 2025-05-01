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
  return <div style={{padding: 40, fontSize: 32}}>Test Render - If you see this, React is working!</div>;
}

export default App; 