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
    port: 5174
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