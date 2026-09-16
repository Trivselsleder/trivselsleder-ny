import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Nunito Sans — selvhostet via npm (@fontsource), ALDRI Google Fonts (personvern:
// ingen fontforespørsel til Google fra brukerens nettleser). Vektene vi faktisk bruker.
import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/400-italic.css'
import '@fontsource/nunito-sans/500.css'
import '@fontsource/nunito-sans/600.css'
import '@fontsource/nunito-sans/700.css'
import '@fontsource/nunito-sans/800.css'
import './index.css'
import './i18n'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
