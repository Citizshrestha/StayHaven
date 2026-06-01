import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        {/* Animated 404 */}
        <div className="not-found-number">
          <span className="digit">4</span>
          <span className="digit animated">0</span>
          <span className="digit">4</span>
        </div>

        {/* Main Message */}
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-description">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="not-found-actions">
          <button onClick={handleGoHome} className="btn-primary">
            <Home size={20} />
            <span>Go to Homepage</span>
          </button>
          <button onClick={handleGoBack} className="btn-secondary">
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
        </div>

        {/* Helpful Links */}
        <div className="not-found-links">
          <h3 className="links-title">
            <HelpCircle size={18} />
            <span>Maybe you were looking for:</span>
          </h3>
          <div className="links-grid">
            <a href="/" className="link-item">
              <Home size={16} />
              <span>Home</span>
            </a>
            <a href="/hotels" className="link-item">
              <Search size={16} />
              <span>Browse Hotels</span>
            </a>
            <a href="/destinations" className="link-item">
              <Search size={16} />
              <span>Destinations</span>
            </a>
            <a href="/contactus" className="link-item">
              <HelpCircle size={16} />
              <span>Contact Us</span>
            </a>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="decorative-circle circle-1"></div>
        <div className="decorative-circle circle-2"></div>
        <div className="decorative-circle circle-3"></div>
      </div>
    </div>
  );
};

export default NotFound;
