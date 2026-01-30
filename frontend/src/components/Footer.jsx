import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt,
  FaHeart
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">SH</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">StayHaven</h2>
                <p className="text-teal-400 text-sm font-medium">Luxury Stays, Unbeatable Prices</p>
              </div>
            </div>
            
            <p className="text-gray-400 leading-relaxed text-sm">
              Discover exceptional stays curated just for you. 
            </p>
            
            <div className="flex space-x-4">
              {[FaFacebook, FaTwitter, FaInstagram].map((Icon, index) => (
                <a 
                  key={index}
                  href="#" 
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 hover:bg-teal-600 hover:text-white transition-all duration-300"
                  aria-label="Social media"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links - NO HOTELS LINK */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white pb-2 border-b border-gray-800">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-400 hover:text-teal-400 transition-colors duration-300">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/destinations" className="text-gray-400 hover:text-teal-400 transition-colors duration-300">
                  Destinations
                </Link>
              </li>
              <li>
                <Link to="/offers" className="text-gray-400 hover:text-teal-400 transition-colors duration-300">
                  Special Offers
                </Link>
              </li>
              <li>
                <Link to="/membership" className="text-gray-400 hover:text-teal-400 transition-colors duration-300">
                  Membership
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-teal-400 transition-colors duration-300">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white pb-2 border-b border-gray-800">
                Contact Us
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-teal-400 mt-1 flex-shrink-0" size={16} />
                  <span className="text-gray-400 text-sm">Chitwan, Nepal</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaPhone className="text-teal-400 flex-shrink-0" size={16} />
                  <span className="text-gray-400 text-sm">+977 1-1234567</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaEnvelope className="text-teal-400 flex-shrink-0" size={16} />
                  <a href="mailto:info@stayhaven.com" className="text-gray-400 hover:text-teal-400 text-sm">
                    info@stayhaven.com
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-white pb-2 border-b border-gray-800">
                Newsletter
              </h3>
              <div className="space-y-3">
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-grow px-4 py-2 text-gray-900 text-sm rounded-l-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button 
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm rounded-r-lg transition-colors duration-300 font-medium"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm">
                &copy; {currentYear} StayHaven. All rights reserved.
              </p>
            </div>
            
            <div className="flex gap-4">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </Link>
              <Link to="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;