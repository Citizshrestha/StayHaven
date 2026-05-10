import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import { ThemeProvider } from './core/context/ThemeContext'

// Suppress browser extension errors (cookie managers, translation extensions, etc.)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const name = reason?.name;
  const message = reason?.message;
  const text = String(name || message || reason || '');

  // List of known browser extension errors to suppress
  const extensionErrors = [
    'RegisterClientLocalizationsError',
    'MessageNotSentError',
    'translations',
    'localization',
    'cookieManager',
    'Could not establish connection',
    'Receiving end does not exist',
    'injectClientScript'
  ];

  if (extensionErrors.some(err => text.includes(err))) {
    event.preventDefault();
    // Silently suppress - no console output
    return;
  }
});

// Suppress console errors from browser extensions
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');

  // List of known browser extension errors to suppress
  const extensionErrors = [
    'RegisterClientLocalizationsError',
    'MessageNotSentError',
    'translations',
    'localization',
    'cookieManager',
    'Could not establish connection',
    'Receiving end does not exist',
    'injectClientScript'
  ];

  if (extensionErrors.some(err => message.includes(err))) {
    return; // Silently suppress
  }

  originalError.apply(console, args);
};

// Suppress console warnings from browser extensions
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');

  const extensionWarnings = [
    'extension',
    'cookieManager',
    'localization'
  ];

  if (extensionWarnings.some(warn => message.toLowerCase().includes(warn.toLowerCase()))) {
    return; // Silently suppress
  }

  originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
