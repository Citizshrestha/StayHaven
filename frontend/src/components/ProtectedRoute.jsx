import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children }) => {
  const [isAuth, setIsAuth] = useState(null); // null = loading, true = authenticated, false = not authenticated
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = localStorage.getItem('accessToken');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        setIsAuth(false);
        setLoading(false);
        return;
      }

      try {
        const response = await isAuthenticated(userId);
        if (response.success) {
          setIsAuth(true);
        } else {
          setIsAuth(false);
          // Clear invalid tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('email');
          localStorage.removeItem('username');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuth(false);
        // Clear invalid tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('email');
        localStorage.removeItem('username');
        toast.error('Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
