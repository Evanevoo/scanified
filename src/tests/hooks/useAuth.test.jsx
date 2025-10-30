import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';

// Mock Supabase
jest.mock('../../supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    
    const { result } = renderHook(() => {
      const { useAuth } = require('../../hooks/useAuth');
      return useAuth();
    }, { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.profile).toBe(null);
    expect(result.current.organization).toBe(null);
  });

  it('should handle successful authentication', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockProfile = { id: 'profile-1', user_id: 'user-1', role: 'admin' };
    const mockOrganization = { id: 'org-1', name: 'Test Org' };

    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => {
      const { useAuth } = require('../../hooks/useAuth');
      return useAuth();
    }, { wrapper });

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.loading).toBe(false);
  });

  it('should handle authentication errors', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('Auth error'));

    const { result } = renderHook(() => {
      const { useAuth } = require('../../hooks/useAuth');
      return useAuth();
    }, { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('should provide signOut function', () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => {
      const { useAuth } = require('../../hooks/useAuth');
      return useAuth();
    }, { wrapper });

    expect(typeof result.current.signOut).toBe('function');
  });

  it('should handle trial expiration', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockProfile = { id: 'profile-1', user_id: 'user-1', role: 'admin' };
    const mockOrganization = { 
      id: 'org-1', 
      name: 'Test Org',
      subscription_status: 'trial',
      subscription_end_date: new Date(Date.now() - 86400000).toISOString() // Yesterday
    };

    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => {
      const { useAuth } = require('../../hooks/useAuth');
      return useAuth();
    }, { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.trialExpired).toBe(true);
  });
});
