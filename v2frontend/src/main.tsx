import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerPWA } from './pwa/sw-register.ts'

const CURRENT_V = 'CV_25_MAR_2026_SSO_SAFE';
console.log(`--- SYSTEM_VERSION: ${CURRENT_V} ---`);

const currentUrl = new URL(window.location.href);
const isSsoCallback =
    currentUrl.pathname.includes('/auth/sso') &&
    currentUrl.searchParams.has('token');

// Extreme cache kill but SSO safe
if (localStorage.getItem('SW_VERSION') !== CURRENT_V) {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
                registration.unregister();
                console.log('SW Unregistered for update');
            }
        });
    }

    localStorage.setItem('SW_VERSION', CURRENT_V);

    if (!isSsoCallback && currentUrl.searchParams.get('v') !== CURRENT_V) {
        currentUrl.searchParams.set('v', CURRENT_V);
        window.location.replace(
            `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
        );
    }
}

registerPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
