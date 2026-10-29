import '@fontsource/rye'
import '@fontsource/abril-fatface'
import '@fontsource/libre-baskerville/400.css'
import '@fontsource/libre-baskerville/400-italic.css'
import '@fontsource/libre-baskerville/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './lib/auth.tsx'
import { EditModeProvider } from './lib/editMode.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EditModeProvider>
          <App />
        </EditModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
