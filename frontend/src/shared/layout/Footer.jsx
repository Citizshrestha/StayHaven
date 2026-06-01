import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube,
  ArrowRight, Heart, Users, Lock, Shield, Clock
} from 'lucide-react';
import { useContent } from '../../hooks/useContent';
import { getFooterContent } from '../../core/api/services/content.service';

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

  const { data: footerDataArray } = useContent('footer', getFooterContent);
  const footer = footerDataArray?.[0] || null;

  const quickLinks = footer?.quickLinks?.length > 0
    ? footer.quickLinks.map(l => ({ label: l.label, path: l.href }))
    : [
        { label: 'Home', path: '/' },
        { label: 'About Us', path: '/about' },
        { label: 'Destinations', path: '/destinations' },
        { label: 'Offers & Deals', path: '/offers' },
        { label: 'Membership', path: '/memberships' },
      ];

  const exploreLinks = footer?.exploreLinks?.length > 0
    ? footer.exploreLinks.map(l => ({ label: l.label, path: l.href }))
    : [
        { label: 'Browse Hotels', path: '/hotels' },
        { label: 'Kathmandu', path: '/hotels' },
        { label: 'Pokhara', path: '/hotels' },
        { label: 'Chitwan', path: '/hotels' },
        { label: 'Lumbini', path: '/hotels' },
      ];

  const supportLinks = [
    { label: 'FAQ', path: '/' },
    { label: 'Contact Us', path: '/contactus' },
    { label: 'Privacy Policy', path: '/' },
    { label: 'Terms of Service', path: '/' },
    { label: 'Feedback', path: '/feedback' },
  ];

  const contactInfo = footer?.contactInfo || {
    address: 'Thamel, Kathmandu, Nepal',
    phone: '+977 01-2136 567',
    email: 'support@stayhaven.com.np'
  };

  const socialPlatforms = {
    Facebook,
    Instagram,
    Twitter,
    Youtube
  };

  const socialLinks = footer?.socialLinks?.length > 0
    ? footer.socialLinks.map(s => ({
        Icon: socialPlatforms[s.platform] || Facebook,
        link: s.url || '#',
        label: s.platform
      }))
    : [
        { Icon: Facebook, link: '#', label: 'Facebook' },
        { Icon: Instagram, link: '#', label: 'Instagram' },
        { Icon: Twitter, link: '#', label: 'Twitter' },
        { Icon: Youtube, link: '#', label: 'YouTube' }
      ];

  return (
    <footer className="relative">
      {/* Newsletter section — Enhanced with gradient and better spacing */}
      {footer?.newsletterEnabled !== false && (
        <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 border-t border-teal-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-16 pb-20">
            <div className="relative mb-8 overflow-hidden rounded-3xl border border-teal-100 bg-white p-10 shadow-2xl md:mb-10 md:p-12">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-100/30 to-emerald-100/30 rounded-full blur-3xl -z-0"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/30 to-teal-100/30 rounded-full blur-3xl -z-0"></div>
              
              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
                  <Mail
                    className="mt-0.5 size-9 shrink-0 text-[#0ea5a0] sm:size-10"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="mb-2 text-2xl font-bold text-gray-900">Stay in the Loop!</h3>
                    <p className="max-w-xl text-base leading-relaxed text-gray-600">
                      Get exclusive hotel deals, travel tips, and special offers delivered straight to your inbox.
                      <span className="font-semibold text-[#0d9488]"> Join 10,000+ travelers!</span>
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSubscribe}
                  className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:min-w-[min(100%,28rem)]"
                >
                  <label htmlFor="footer-newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-xl bg-gray-50 px-4 py-2 transition-all focus-within:bg-white focus-within:shadow-lg sm:min-w-[240px] md:w-80 md:flex-none">
                    <Mail
                      className="size-5 shrink-0 text-gray-400"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <input
                      id="footer-newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      autoComplete="email"
                      className="min-w-0 flex-1 bg-transparent py-0.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="inline-flex h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0ea5a0] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0d9489] disabled:cursor-not-allowed disabled:opacity-50"
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
      )}

      {/* Main footer — Enhanced dark theme */}
      <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900">
        <div className="container mx-auto max-w-full px-4 sm:px-6 lg:px-8 xl:px-[6vw] py-16">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-10">

            {/* Brand column — Enhanced (full width on mobile 2-col grid) */}
            <div className="col-span-2 min-w-0 lg:col-span-3">
              <div className="flex items-center gap-3 mb-5">
                <img
                  src="/logo.png"
                  alt="StayHaven Logo"
                  className="w-12 h-12 object-contain"
                />
                <span className="text-white text-2xl font-bold" style={{ fontFamily: 'Nunito' }}>
                  Stay<span className="text-teal-400">Haven</span>
                </span>
              </div>
              <p className="text-gray-400 text-base leading-relaxed mb-6 max-w-none sm:max-w-sm">
                Nepal's most trusted hotel booking platform. Handpicked stays from luxury resorts to boutique guesthouses.
              </p>

              <div className="space-y-3 mb-6">
                <a href="#" className="flex items-center gap-3 text-sm text-gray-400 hover:text-teal-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-all">
                    <MapPin className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
                  </div>
                  {contactInfo.address}
                </a>
                <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-3 text-sm text-gray-400 hover:text-teal-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-all">
                    <Phone className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
                  </div>
                  {contactInfo.phone}
                </a>
                <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-3 text-sm text-gray-400 hover:text-teal-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-all">
                    <Mail className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
                  </div>
                  {contactInfo.email}
                </a>
              </div>

              <div className="flex items-center gap-3">
                {socialLinks.map(({ Icon, link, label }) => (
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
            <div className="col-span-1 min-w-0 lg:col-span-3 lg:mt-8">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full"></div>
                Quick Links
              </h4>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.path)}
                      className="w-full text-left text-sm text-gray-400 hover:text-teal-400 hover:translate-x-0.5 transition-all flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Explore */}
            <div className="col-span-1 min-w-0 lg:col-span-3 lg:mt-8">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full"></div>
                Explore
              </h4>
              <ul className="space-y-2.5">
                {exploreLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.path)}
                      className="w-full text-left text-sm text-gray-400 hover:text-teal-400 hover:translate-x-0.5 transition-all flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support + Trust */}
            <div className="col-span-2 min-w-0 lg:col-span-3 lg:mt-8">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full"></div>
                Support
              </h4>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-2.5">
                {supportLinks.map((link) => (
                  <li key={link.label} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(link.path)}
                      className="w-full text-left text-sm text-gray-400 hover:text-teal-400 hover:translate-x-0.5 transition-all flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
              
              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 px-3 py-2.5 rounded-lg">
                  <Shield className="w-4 h-4 shrink-0 text-teal-500" />
                  <span className="leading-snug">SSL Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 px-3 py-2.5 rounded-lg">
                  <Clock className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span className="leading-snug">24/7 Customer Support</span>
                </div>
              </div>
            </div>

            {/* Bottom section with payment methods and staff login */}
            <div className="col-span-2 lg:col-span-12">
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
                  <div className="mx-auto inline-flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm sm:px-6 sm:py-4">
                    <p className="text-sm font-semibold tracking-wide text-gray-200 sm:text-base md:text-lg">
                      &copy; {new Date().getFullYear()} StayHaven. All rights reserved.
                    </p>
                    <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm font-medium text-teal-300 sm:text-base">
                      <MapPin className="h-4 w-4 text-teal-400" />
                      <span className="inline-flex items-center gap-1.5">
                        Made with
                        <Heart className="h-4 w-4 animate-pulse fill-rose-500 text-rose-500" />
                        in Nepal
                      </span>
                    </p>
                  </div>
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