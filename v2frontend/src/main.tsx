import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerPWA } from './pwa/sw-register.ts'

const CURRENT_V = 'CV_23_FEB_V5_STABLE';
console.log(`--- SYSTEM_VERSION: ${CURRENT_V} ---`);

// Extreme cache kill
if (localStorage.getItem('SW_VERSION') !== CURRENT_V) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('SW Unregistered for update');
      }
    });
  }
  localStorage.clear(); // Clear all data to be sure
  localStorage.setItem('SW_VERSION', CURRENT_V);

  // Only reload if we actually did something
  if (window.location.search !== '?v=' + CURRENT_V) {
    window.location.search = '?v=' + CURRENT_V;
  }
}

registerPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
