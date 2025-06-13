import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native$': 'react-native-web'
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/auth/v1': {
        target: 'https://jtfucttzaswmqqhmmhfb.supabase.co',
        changeOrigin: true,
        secure: false,
        headers: {
          'Origin': 'http://localhost:5174'
        }
      }
    },
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey']
    }
  },
  preview: {
    port: 5174
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  optimizeDeps: {
    exclude: ['trackabout']
  },
  define: {
    __VITE_EXCLUDE_TRACKABOUT__: true
  }
}); 