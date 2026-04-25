import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-gray-900 dark:text-white',
              style: {
                background: 'var(--toast-bg, rgba(255, 255, 255, 0.8))',
                backdropFilter: 'blur(12px)',
                color: 'var(--toast-text, #1f2937)',
                border: '1px solid var(--toast-border, rgba(0,0,0,0.05))',
                borderRadius: '1rem',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
                padding: '12px 20px',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
