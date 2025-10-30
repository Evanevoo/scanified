import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../supabase/client';

export const useOwnerAccess = (profile) => {
  const { user } = useAuth();
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
                         profile?.email === 'evankorial7@gmail.com' || // Owner email
                         user.email === 'evankorial7@gmail.com'; // Owner email

      setIsOwner(isOwnerUser);
      
      // If not owner, redirect to unauthorized page
      if (!isOwnerUser) {
        console.warn('Unauthorized access attempt to owner portal');
        // You could redirect here if needed
        // window.location.href = '/unauthorized';
      }
    } catch (error) {
      console.error('Error checking owner access:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  return { isOwner, loading };
}; 