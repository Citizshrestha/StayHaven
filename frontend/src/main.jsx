import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import { ThemeProvider } from './core/context/ThemeContext'

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const name = reason?.name;
  const message = reason?.message;
  const text = String(name || message || reason || '');

  if (text.includes('RegisterClientLocalizationsError')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
