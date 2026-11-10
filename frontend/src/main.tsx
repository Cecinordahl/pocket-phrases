import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Celebration } from './components/Celebration.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Celebration />
  </StrictMode>,
)
