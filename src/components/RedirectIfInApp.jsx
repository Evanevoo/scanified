import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/** Logged-in org users stay in the app shell; marketing/demo pages are for visitors only. */
export default function RedirectIfInApp({ children }) {
  const { profile, organization } = useAuth();
  if (profile && organization) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
