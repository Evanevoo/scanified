import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SEO: marketing routes are a client-rendered SPA. Crawlers get sitemap/robots in /public;
// for richer previews consider Netlify prerender (see netlify.toml) or a prerender service.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5174,
    // .agents/skills contains symlinked files (from `npx skills add`) that crash
    // Vite's Windows file watcher with EBUSY; it's tooling config, not app source.
    watch: {
      ignored: ['**/.agents/**'],
    },
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5174
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  publicDir: 'public'
}); 