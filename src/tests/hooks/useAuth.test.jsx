import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';

// Mock Supabase
jest.mock('../../supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      // useAuth.jsx destructures { data: listener } from this call's return value --
      // a bare jest.fn() returns undefined, so every test crashed before running.
      // Matches the real supabase-js contract: { data: { subscription } }.
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
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
    const mockProfile = { id: 'profile-1', user_id: 'user-1', role: 'admin', organization_id: 'org-1' };
    const mockOrganization = {
      id: 'org-1',
      name: 'Test Org',
      subscription_status: 'trial',
      // useAuth.jsx checks trial_end_date specifically (there's also a separate,
      // differently-named trial_ends_at/subscription_end_date pair in the real
      // schema -- this field name is the one the actual product code reads).
      trial_end_date: new Date(Date.now() - 86400000).toISOString() // Yesterday
    };

    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    // useAuth.jsx queries 'profiles' then 'organizations' twice (a deleted-check
    // query, then the real fetch which also chains .is('deleted_at', null) before
    // .single()). A single blanket mockReturnValue answered both tables with
    // mockProfile via a select().eq().single() chain that had no .is() method --
    // calling .is() on it threw, which got swallowed and left trialExpired at its
    // false default. Build a fully chainable mock so any of select/eq/is can be
    // called in any order before single() resolves.
    const makeChainable = (resolvedValue) => {
      const chain = {};
      ['select', 'eq', 'is', 'order', 'limit'].forEach((method) => {
        chain[method] = jest.fn().mockReturnValue(chain);
      });
      chain.single = jest.fn().mockResolvedValue(resolvedValue);
      chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
      return chain;
    };
    supabase.from.mockImplementation((table) =>
      makeChainable({
        data: table === 'organizations' ? mockOrganization : mockProfile,
        error: null,
      })
    );

    const { result } = renderHook(() => {
      const { useAuth } = require('../../hooks/useAuth');
      return useAuth();
    }, { wrapper });

    // This flow is three sequential awaited Supabase calls (profile, then the
    // org-deleted check, then the real org fetch) -- a single setTimeout(0) tick
    // (the pattern the other tests in this file use) doesn't reliably flush all
    // three before the assertion runs. waitFor retries until it settles.
    await waitFor(() => {
      expect(result.current.trialExpired).toBe(true);
    });
  });
});
