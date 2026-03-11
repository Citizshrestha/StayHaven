import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
<<<<<<< HEAD
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { StaffAuthProvider } from './context/StaffAuthContext'
import { SocketProvider } from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'
=======
import App from './app/App.jsx'
import { ThemeProvider } from './core/context/ThemeContext'
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe

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
<<<<<<< HEAD
      <StaffAuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </SocketProvider>
      </StaffAuthProvider>
=======
      <App />
>>>>>>> fdaae3dffdc7121130444a067ee3a87c420addbe
    </ThemeProvider>
  </StrictMode>,
)
