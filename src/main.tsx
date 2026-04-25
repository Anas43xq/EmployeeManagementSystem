import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import { initializeErrorHandlers } from './lib/errorHandler'
import App from './App.tsx'
import './index.css'


initializeErrorHandlers()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
