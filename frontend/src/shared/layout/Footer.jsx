import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube,
  Building2, Shield, Clock, ArrowRight, Heart, Users, Lock
} from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubscribing(true);
    // Simulate API call
    setTimeout(() => {
      alert('Thank you for subscribing!');
      setEmail('');
      setIsSubscribing(false);
    }, 1000);
  };

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
      {/* Newsletter section — Enhanced with gradient and better spacing */}
      <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 border-t border-teal-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-16">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-100 p-10 md:p-12 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-100/30 to-emerald-100/30 rounded-full blur-3xl -z-0"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/30 to-teal-100/30 rounded-full blur-3xl -z-0"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-start gap-5 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-xl">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold text-2xl mb-2">Stay in the Loop!</h3>
                  <p className="text-gray-600 text-base leading-relaxed max-w-md">
                    Get exclusive hotel deals, travel tips, and special offers delivered straight to your inbox. 
                    <span className="text-teal-600 font-semibold"> Join 10,000+ travelers!</span>
                  </p>
                </div>
              </div>
              
              <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-3">
                <div className="relative flex-1 md:w-80">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap flex items-center gap-2"
                >
                  {isSubscribing ? 'Subscribing...' : (
                    <>
                      Subscribe <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer — Enhanced dark theme */}
      <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-10">

            {/* Brand column — Enhanced */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-2xl font-bold" style={{ fontFamily: 'Nunito' }}>
                  Stay<span className="text-teal-400">Haven</span>
                </span>
              </div>
              <p className="text-gray-400 text-base leading-relaxed mb-6 max-w-sm">
                Nepal's most trusted hotel booking platform. Handpicked stays from luxury resorts to boutique guesthouses.
              </p>

              <div className="space-y-3 mb-6">
                <a href="#" className="flex items-center gap-3 text-sm text-gray-400 hover:text-teal-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-all">
                    <MapPin className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
                  </div>
                  Thamel, Kathmandu, Nepal
                </a>
                <a href="tel:+97701-2136567" className="flex items-center gap-3 text-sm text-gray-400 hover:text-teal-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-all">
                    <Phone className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
                  </div>
                  +977 01-2136 567
                </a>
                <a href="mailto:support@stayhaven.com.np" className="flex items-center gap-3 text-sm text-gray-400 hover:text-teal-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-all">
                    <Mail className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
                  </div>
                  support@stayhaven.com.np
                </a>
              </div>

              <div className="flex items-center gap-3">
                {[
                  { Icon: Facebook, link: '#', label: 'Facebook' },
                  { Icon: Instagram, link: '#', label: 'Instagram' },
                  { Icon: Twitter, link: '#', label: 'Twitter' },
                  { Icon: Youtube, link: '#', label: 'YouTube' }
                ].map(({ Icon, link, label }) => (
                  <a
                    key={label}
                    href={link}
                    aria-label={label}
                    className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gradient-to-br hover:from-teal-500 hover:to-emerald-500 flex items-center justify-center transition-all duration-300 group shadow-lg hover:shadow-teal-500/50"
                  >
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2 lg:ml-auto">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full"></div>
                Quick Links
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-sm text-gray-400 hover:text-teal-400 hover:translate-x-1 transition-all flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Explore */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full"></div>
                Explore
              </h4>
              <ul className="space-y-3">
                {exploreLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-sm text-gray-400 hover:text-teal-400 hover:translate-x-1 transition-all flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support + Trust */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full"></div>
                Support
              </h4>
              <ul className="space-y-3">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-sm text-gray-400 hover:text-teal-400 hover:translate-x-1 transition-all flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
              
              {/* Trust badges */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 px-3 py-2 rounded-lg">
                  <Shield className="w-4 h-4 text-teal-500" /> 
                  <span>SSL Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-emerald-500" /> 
                  <span>24/7 Customer Support</span>
                </div>
              </div>
            </div>

            {/* Bottom section with payment methods and staff login */}
            <div className="lg:col-span-12">
              <div className="border-t border-gray-800 mt-4 pt-8">
                {/* Payment methods */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    <span className="text-xs text-gray-500 font-semibold">We accept:</span>
                    {[
                      { name: 'eSewa', color: 'from-green-500 to-green-600', textColor: 'text-white' },
                      { name: 'Khalti', color: 'from-purple-500 to-purple-600', textColor: 'text-white' },
                      { name: 'Visa', color: 'from-blue-500 to-blue-600', textColor: 'text-white' },
                      { name: 'Mastercard', color: 'from-orange-500 to-red-500', textColor: 'text-white' },
                    ].map((m) => (
                      <span 
                        key={m.name} 
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${m.color} ${m.textColor} rounded-lg shadow-md`}
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                  
                  {/* Staff Login Button */}
                  <button
                    onClick={() => navigate('/staff/login')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-teal-600 hover:to-emerald-600 text-gray-300 hover:text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-teal-500/50 border border-gray-700 hover:border-teal-500 group"
                  >
                    <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Staff Login
                    <Lock className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Copyright */}
                <div className="text-center">
                  <p className="text-xs text-gray-600 flex items-center justify-center gap-2 flex-wrap">
                    &copy; {new Date().getFullYear()} StayHaven. All rights reserved. 
                    <span className="flex items-center gap-1">
                      Made with <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> in Nepal
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;