import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieDisclaimer = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('goauct_cookies_accepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('goauct_cookies_accepted', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-[999] md:max-w-sm"
        >
          <div className="bg-[#0A1322]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Cookie size={18} className="text-blue-400" />
                <span>We value your privacy</span>
              </div>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-slate-400 text-sm leading-relaxed">
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By continuing to use our site, you consent to our use of cookies.
            </p>
            
            <div className="flex items-center gap-3 mt-2">
              <button 
                onClick={handleAccept}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                Accept All
              </button>
              <Link 
                to="/privacy"
                onClick={() => setIsVisible(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg font-semibold text-sm text-center transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
