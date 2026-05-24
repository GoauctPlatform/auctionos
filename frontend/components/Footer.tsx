import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-[#e7ecf3] dark:border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          &copy; 2026 - goauct.com
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
};
