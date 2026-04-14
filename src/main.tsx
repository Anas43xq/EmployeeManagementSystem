import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import { initializeErrorHandlers } from './services/errorHandler'
import App from './App.tsx'
import './index.css'

// Initialize error handling system
initializeErrorHandlers()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
