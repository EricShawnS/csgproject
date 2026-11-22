import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Restore persisted dark/light theme before initial render to prevent flash
try {
  const adminPrefs = JSON.parse(localStorage.getItem('csg_admin_settings_v1') || '{}');
  const officerPrefs = JSON.parse(localStorage.getItem('csg_officer_settings_v1') || '{}');
  const mode = adminPrefs.theme || officerPrefs.appearance || 'light';
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'auto' && prefersDark);
  document.documentElement.classList.toggle('dark', Boolean(isDark));
} catch {
  // Ignore storage errors in restricted contexts
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);