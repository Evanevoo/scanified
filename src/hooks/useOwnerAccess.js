import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../supabase/client';

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

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
      const isSuperAdmin = SUPER_ADMIN_EMAILS.length > 0 && (
        SUPER_ADMIN_EMAILS.includes(profile?.email) ||
        SUPER_ADMIN_EMAILS.includes(user.email)
      );

      const isOwnerUser = profile?.role === 'owner' || isSuperAdmin;

      setIsOwner(isOwnerUser);

      if (!isOwnerUser) {
        logger.warn('Unauthorized access attempt to owner portal');
      }
    } catch (error) {
      logger.error('Error checking owner access:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  return { isOwner, loading };
}; 