//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import process from "process";


import { UserProvider } from './context/UserContextApi.jsx';

window.process = process;
window.global = window;

// Dynamically import Buffer to avoid static ESM import/export mismatch with the Vite optimized
// dependency wrapper (prevents errors like "does not provide an export named 'default'").
(async () => {
  if (typeof window.Buffer === 'undefined') {
    try {
      const mod = await import('buffer');
      // mod may export Buffer as a named export
      if (mod && mod.Buffer) {
        window.Buffer = mod.Buffer;
      }
    } catch (err) {
      // If dynamic import fails, don't crash the app; log for debugging
      // (some environments may already have Buffer available)
      // console.warn('Could not load buffer polyfill:', err);
    }
  }
})();



createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <UserProvider>
    <App />
  </UserProvider>
  // </StrictMode>,
)
