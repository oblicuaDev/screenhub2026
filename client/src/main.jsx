import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10B981', secondary: 'transparent' } },
          error: { iconTheme: { primary: '#EF4444', secondary: 'transparent' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
