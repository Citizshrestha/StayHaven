import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { StaffAuthProvider } from './context/StaffAuthContext'
import { SocketProvider } from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'

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
      <StaffAuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </SocketProvider>
      </StaffAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
