import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app/App.tsx'
import { applyTheme, loadTheme } from './app/theme.ts'
import { dataStore } from './data'
import { registerServiceWorker } from './app/serviceWorker'

applyTheme(loadTheme())
// apre IndexedDB subito: migrazioni, richiesta di persistenza, backup automatico
void dataStore.init()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
