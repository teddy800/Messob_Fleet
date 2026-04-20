import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 1. Import this
import App from './App.jsx'
import './index.css'
import { useUserStore } from './store/useUserStore'

// Initialize authentication state from localStorage
useUserStore.getState().initializeAuth();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* 2. Wrap your App here */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)