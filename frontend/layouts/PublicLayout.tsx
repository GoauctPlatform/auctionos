import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { CookieDisclaimer } from '../components/CookieDisclaimer';

const PublicLayout = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Solutions', path: '/' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
  ];

  return (
    <div className="dark min-h-screen bg-[#050B14] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? 'bg-[#050B14]/80 backdrop-blur-md border-white/10 py-3'
            : 'bg-transparent border-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <span className="text-white font-bold text-lg leading-none">A</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">GoAuct</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-white text-[#050B14] px-5 py-2.5 rounded-full hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
            >
              Book a Demo
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#050B14]/95 backdrop-blur-xl pt-24 px-6 md:hidden flex flex-col"
          >
            <nav className="flex flex-col gap-6 text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-2xl font-semibold text-slate-200 hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-px bg-white/10 w-full my-4" />
              <Link
                to="/login"
                className="text-xl font-medium text-slate-300 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-xl font-medium bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-500 transition-colors mx-auto mt-4"
              >
                Book a Demo
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="min-h-screen">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#03060A] border-t border-white/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center">
                <span className="text-white font-bold text-lg leading-none">A</span>
              </div>
              <span className="font-bold text-xl text-white">GoAuct</span>
            </Link>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Empowering real estate firms with efficient workflows, intelligent auctions, and seamless operations to scale their businesses globally.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Solutions</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
              <li><Link to="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">Help Center</Link></li>
              <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li>contact@auctionos.com</li>
              <li>1-800-AUCTION</li>
              <li>New York, NY</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
          <p>© {new Date().getFullYear()} AuctionOS. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
      {/* ── Cookie Disclaimer ── */}
      <CookieDisclaimer />
    </div>
  );
};

export default PublicLayout;
