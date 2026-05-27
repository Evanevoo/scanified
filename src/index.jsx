import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { isChunkLoadError } from './utils/lazyWithRetry';
import './tailwind.css';
import './styles/mobile.css';

// After a deploy, old main bundles may reference removed lazy chunks — reload once.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  if (!isChunkLoadError(reason)) return;
  const key = 'scanified_chunk_reload';
  if (sessionStorage.getItem(key)) return;
  event.preventDefault();
  sessionStorage.setItem(key, '1');
  window.location.reload();
});

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />); 