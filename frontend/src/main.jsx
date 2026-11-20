import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/figtree'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { AvisosProvider } from './contexts/AvisosContext.jsx'
import { CompararProvider } from './contexts/CompararContext.jsx'
import { NotificacoesProvider } from './contexts/NotificacoesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AvisosProvider>
        <AuthProvider>
          <NotificacoesProvider>
            <CompararProvider>
              <App />
            </CompararProvider>
          </NotificacoesProvider>
        </AuthProvider>
      </AvisosProvider>
    </BrowserRouter>
  </StrictMode>,
)
