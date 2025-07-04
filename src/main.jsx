import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ChatContextProvider } from './contexts/ChatContext';
import { StatsProvider } from './contexts/StatsContext';  

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChatContextProvider>
          <StatsProvider>
            <App />
            <Toaster
              position="top-right"
              reverseOrder={false}
              toastOptions={{
                duration: 3000,
                style: { background: '#363636', color: '#fff' },
                success: {
                  duration: 2000,
                  theme: { primary: 'green', secondary: 'black' },
                  iconTheme: { primary: '#10B981', secondary: '#FFFFFF' },
                },
                error: {
                  iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
                },
              }}
            />
          </StatsProvider>
        </ChatContextProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
