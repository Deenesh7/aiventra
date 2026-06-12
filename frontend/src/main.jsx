import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
// Initialize Firebase (auth, firestore, storage, analytics) early
import './firebase.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1424',
              color: '#e2e8f0',
              border: '1px solid rgba(0,229,255,0.25)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#00e5ff', secondary: '#04060a' } },
            error: { iconTheme: { primary: '#ff3358', secondary: '#04060a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
