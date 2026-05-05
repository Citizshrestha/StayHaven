import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import { ThemeProvider } from './core/context/ThemeContext'

// Suppress browser extension localization errors
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const name = reason?.name;
  const message = reason?.message;
  const text = String(name || message || reason || '');

  if (
    text.includes('RegisterClientLocalizationsError') ||
    text.includes('translations') ||
    text.includes('localization')
  ) {
    event.preventDefault();
    console.warn('Browser extension localization error suppressed');
  }
});

// Suppress console errors from browser extensions
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('RegisterClientLocalizationsError') ||
    message.includes("Cannot read properties of undefined (reading 'translations')")
  ) {
    return;
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
