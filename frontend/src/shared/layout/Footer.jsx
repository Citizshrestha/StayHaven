import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube,
  Building2, Shield, Clock, ArrowRight, Heart
} from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();

  const quickLinks = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
    { label: 'Destinations', path: '/destinations' },
    { label: 'Offers & Deals', path: '/offers' },
    { label: 'Membership', path: '/memberships' },
  ];

  const exploreLinks = [
    { label: 'Browse Hotels', path: '/hotels' },
    { label: 'Kathmandu', path: '/hotels' },
    { label: 'Pokhara', path: '/hotels' },
    { label: 'Chitwan', path: '/hotels' },
    { label: 'Lumbini', path: '/hotels' },
  ];

  const supportLinks = [
    { label: 'FAQ', path: '/' },
    { label: 'Contact Us', path: '/contact' },
    { label: 'Privacy Policy', path: '/' },
    { label: 'Terms of Service', path: '/' },
    { label: 'Feedback', path: '/feedback' },
  ];

  return (
    <footer className="relative">
      {/* Newsletter section — light bg, visual separator */}
      <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-gray-900 font-bold text-lg">Stay updated with the best deals</h4>
                <p className="text-gray-500 text-sm">Exclusive offers & travel inspiration in your inbox.</p>
              </div>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-60 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
              <button
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center gap-2"
              >
                Subscribe <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer — dark */}
      <div className="bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">

            {/* Brand column */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-lg font-bold" style={{ fontFamily: 'Nunito' }}>
                  Stay<span className="text-teal-400">Haven</span>
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-xs">
                Nepal's most trusted hotel booking platform. Handpicked stays from luxury resorts to boutique guesthouses.
              </p>

              <div className="space-y-2 mb-5">
                {[
                  { Icon: MapPin, text: 'Thamel, Kathmandu, Nepal' },
                  { Icon: Phone, text: '+977 01-2136 567' },
                  { Icon: Mail, text: 'support@stayhaven.com.np' },
                ].map(({ Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                    <Icon className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-teal-500 flex items-center justify-center transition-all duration-200 group"
                  >
                    <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2 lg:ml-auto">
              <h4 className="text-gray-300 font-semibold text-xs uppercase tracking-widest mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-sm text-gray-500 hover:text-teal-400 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Explore */}
            <div className="lg:col-span-2">
              <h4 className="text-gray-300 font-semibold text-xs uppercase tracking-widest mb-4">Explore</h4>
              <ul className="space-y-2">
                {exploreLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-sm text-gray-500 hover:text-teal-400 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support + Trust */}
            <div className="lg:col-span-2">
              <h4 className="text-gray-300 font-semibold text-xs uppercase tracking-widest mb-4">Support</h4>
              <ul className="space-y-2">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-sm text-gray-500 hover:text-teal-400 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Shield className="w-3 h-3 text-teal-600" /> SSL Secure
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Clock className="w-3 h-3 text-teal-600" /> 24/7 Support
                </div>
              </div>
            </div>

            {/* Payment & trust column */}
            <div className="lg:col-span-12">
              <div className="border-t border-gray-800 mt-2 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <span className="text-xs text-gray-600">We accept</span>
                  {[
                    { name: 'eSewa', color: 'text-green-400 border-green-900' },
                    { name: 'Khalti', color: 'text-purple-400 border-purple-900' },
                    { name: 'Visa', color: 'text-blue-400 border-blue-900' },
                    { name: 'Mastercard', color: 'text-orange-400 border-orange-900' },
                  ].map((m) => (
                    <span key={m.name} className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-800 rounded-md border ${m.color}`}>
                      {m.name}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 flex items-center gap-1">
                  &copy; {new Date().getFullYear()} StayHaven. All rights reserved. Made with
                  <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                  in Nepal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;