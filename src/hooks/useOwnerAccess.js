import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../supabase/client';

export const useOwnerAccess = () => {
  const { user, profile } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOwnerAccess();
  }, [user, profile]);

  const checkOwnerAccess = async () => {
    if (!user) {
      setIsOwner(false);
      setLoading(false);
      return;
    }

    try {
      // Check if user has owner role or is a super admin
      // You can customize this logic based on your requirements
      const isOwnerUser = profile?.role === 'owner' || 
                         profile?.email === 'admin@yourcompany.com' || // Replace with your admin email
                         user.email === 'admin@yourcompany.com'; // Replace with your admin email

      setIsOwner(isOwnerUser);
    } catch (error) {
      console.error('Error checking owner access:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  return { isOwner, loading };
}; 