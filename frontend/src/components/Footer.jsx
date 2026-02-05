import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 pt-12">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] pt-24 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="StayHaven Logo" 
                className="w-14 h-14 object-contain"
              />
              <span className="text-xl font-bold tracking-wider text-white" style={{ fontFamily: "Nunito" }}>
                Stay<span className="text-teal-500">Haven</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Your trusted partner for finding the perfect accommodation. Book smarter, stay better, and enjoy seamless in-hotel services.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-teal-600 flex items-center justify-center transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-teal-600 flex items-center justify-center transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-teal-600 flex items-center justify-center transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-teal-600 flex items-center justify-center transition-all duration-300"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Home
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  About Us
                </a>
              </li>
              <li>
                <a href="/destinations" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Destinations
                </a>
              </li>
              <li>
                <a href="/hotels" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Hotels
                </a>
              </li>
              <li>
                <a href="/offers" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Offers
                </a>
              </li>
              <li>
                <a href="/memberships" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Membership
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Cancellation Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400">
                  123 Hotel Street, Tourism District, Kathmandu, Nepal
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <a href="tel:+9771234567890" className="text-sm text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  +977 123-456-7890
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <a href="mailto:info@stayhaven.com" className="text-sm text-gray-400 hover:text-teal-500 transition-colors duration-300">
                  info@stayhaven.com
                </a>
              </li>
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Available 24/7</p>
              <p className="text-xs text-gray-500">We're here to help you anytime, anywhere</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {currentYear} StayHaven. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-teal-500 transition-colors duration-300">
                Cookie Policy
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-teal-500 transition-colors duration-300">
                Sitemap
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-teal-500 transition-colors duration-300">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;