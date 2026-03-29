import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { OpenCADAPI } from './api';
import './lib/styles.css';

// Expose client API globally for plugins and scripts
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).OpenCAD = new OpenCADAPI();
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
