import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global application state store using Zustand
 */
export const useAppStore = create(
  persist(
    (set, get) => ({
      // User and authentication state
      user: null,
      profile: null,
      isAuthenticated: false,

      // UI state
      sidebarOpen: true,
      theme: 'light',
      notifications: [],
      loadingStates: {},

      // Data state
      recentCustomers: [],
      recentCylinders: [],
      searchHistory: [],

      // Import state
      importProgress: 0,
      importStatus: 'idle', // 'idle', 'importing', 'completed', 'error'
      importErrors: [],

      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      setProfile: (profile) => set({ profile }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setTheme: (theme) => set({ theme }),

      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...notification
          },
          ...state.notifications
        ].slice(0, 50) // Keep only last 50 notifications
      })),

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),

      clearNotifications: () => set({ notifications: [] }),

      setLoadingState: (key, isLoading) => set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [key]: isLoading
        }
      })),

      addRecentCustomer: (customer) => set((state) => ({
        recentCustomers: [
          customer,
          ...state.recentCustomers.filter(c => c.id !== customer.id)
        ].slice(0, 10) // Keep only last 10
      })),

      addRecentCylinder: (cylinder) => set((state) => ({
        recentCylinders: [
          cylinder,
          ...state.recentCylinders.filter(c => c.id !== cylinder.id)
        ].slice(0, 10) // Keep only last 10
      })),

      addSearchHistory: (searchTerm) => set((state) => ({
        searchHistory: [
          searchTerm,
          ...state.searchHistory.filter(term => term !== searchTerm)
        ].slice(0, 20) // Keep only last 20 searches
      })),

      clearSearchHistory: () => set({ searchHistory: [] }),

      setImportProgress: (progress) => set({ importProgress: progress }),

      setImportStatus: (status) => set({ importStatus: status }),

      addImportError: (error) => set((state) => ({
        importErrors: [...state.importErrors, error]
      })),

      clearImportErrors: () => set({ importErrors: [] }),

      resetImportState: () => set({
        importProgress: 0,
        importStatus: 'idle',
        importErrors: []
      }),

      // Computed selectors
      getRecentCustomers: () => get().recentCustomers,
      getRecentCylinders: () => get().recentCylinders,
      getSearchHistory: () => get().searchHistory,
      getNotifications: () => get().notifications,
      getLoadingState: (key) => get().loadingStates[key] || false,

      // Utility actions
      logout: () => set({
        user: null,
        profile: null,
        isAuthenticated: false,
        recentCustomers: [],
        recentCylinders: [],
        searchHistory: [],
        notifications: [],
        importProgress: 0,
        importStatus: 'idle',
        importErrors: []
      }),

      // Batch updates
      updateMultipleStates: (updates) => set((state) => ({
        ...state,
        ...updates
      }))
    }),
    {
      name: 'gas-cylinder-app-storage',
      partialize: (state) => ({
        // Only persist these states
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        recentCustomers: state.recentCustomers,
        recentCylinders: state.recentCylinders,
        searchHistory: state.searchHistory
      })
    }
  )
);

// Export individual selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useProfile = () => useAppStore((state) => state.profile);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useTheme = () => useAppStore((state) => state.theme);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useImportState = () => useAppStore((state) => ({
  progress: state.importProgress,
  status: state.importStatus,
  errors: state.importErrors
}));

export default useAppStore; 