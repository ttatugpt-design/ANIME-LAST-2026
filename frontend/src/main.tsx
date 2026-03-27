import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/react-query'
import { routes } from './routes'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

const router = createBrowserRouter(routes);

import './index.css'
import './i18n'

// Add a global listener for chunk load errors (Vite)
// This happens when a new deployment is made and the old chunks are no longer available.
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Failed to fetch dynamically imported module') || e.message.includes('Importing a module script failed'))) {
    console.warn('Chunk load error detected, reloading page...', e);
    window.location.reload();
  }
}, true);

// Also handle unhandled rejections for the same error
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && (e.reason.message?.includes('Failed to fetch dynamically imported module') || e.reason.message?.includes('Importing a module script failed'))) {
    console.warn('Chunk load error in promise detected, reloading page...', e.reason);
    window.location.reload();
  }
});

// Dynamically inject flag-icons CSS from backend
const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api', '');
const flagIconsLink = document.createElement('link');
flagIconsLink.rel = 'stylesheet';
flagIconsLink.href = `${apiBase}/flag-icons/css/flag-icons.min.css`;
document.head.appendChild(flagIconsLink);



import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { CookieConsent } from "@/components/common/CookieConsent"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
          <Toaster />
          <CookieConsent />
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
