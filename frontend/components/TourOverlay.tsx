import React, { useState, useEffect } from 'react';
import { useTour } from '../context/TourContext';
import { useLocation } from 'react-router-dom';

export const TourOverlay: React.FC = () => {
  const { tourActive, activeStep, steps, nextStep, prevStep, endTour } = useTour();
  const location = useLocation();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[activeStep];

  useEffect(() => {
    if (!tourActive || !step) return;

    const updateRect = () => {
      if (step.target === 'none') {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    // Delay slightly to let the route fully load and render layout
    const t = setTimeout(updateRect, 500);
    const interval = setInterval(updateRect, 300); // Continuous polling to dynamically snap and prevent loss on slow loads!

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [tourActive, activeStep, step, location.pathname]);

  if (!tourActive || !step) return null;

  // Position calculation for tooltip card
  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: '350px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow > 300) {
      // Place below highlighted element
      cardStyle.top = rect.bottom + 16;
      cardStyle.left = Math.max(16, Math.min(window.innerWidth - 366, rect.left + rect.width / 2 - 175));
    } else if (spaceAbove > 300) {
      // Place above highlighted element
      cardStyle.bottom = (window.innerHeight - rect.top) + 16;
      cardStyle.left = Math.max(16, Math.min(window.innerWidth - 366, rect.left + rect.width / 2 - 175));
    } else {
      // Fallback: place to the right or center
      cardStyle.top = '50%';
      cardStyle.left = '50%';
      cardStyle.transform = 'translate(-50%, -50%)';
    }
  } else {
    // Center card in viewport when target is "none"
    cardStyle.top = '50%';
    cardStyle.left = '50%';
    cardStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none select-none">
      {/* No pointer blocker backdrop is rendered here so the user can interactively browse the dashboard, change pages and click items. Clicks are passed through successfully, maintaining tour persistence until the explicit close 'X' or last step button is pressed. */}

      {/* Spotlight Frame Outline (no dark shadow mask) */}
      {rect && (
        <div 
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: '16px',
            border: '2.5px solid #10b981', // Emerald outline for positive glow
            zIndex: 9995,
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse"
        />
      )}

      {/* Floating Card */}
      <div 
        style={cardStyle} 
        className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-300 select-text"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step {activeStep + 1} of {steps.length}
          </span>
          <button 
            onClick={endTour}
            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-xs font-bold uppercase tracking-widest"
          >
            Skip
          </button>
        </div>

        {/* Card Body */}
        <div className="space-y-2">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">
            {step.title}
          </h3>
          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
            {step.content}
          </p>
        </div>

        {/* Card Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
          <button
            onClick={prevStep}
            disabled={activeStep === 0}
            className="px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white uppercase tracking-wider disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
          >
            Previous
          </button>

          <button
            onClick={nextStep}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-1 transition-all active:scale-[0.98]"
          >
            {activeStep === steps.length - 1 ? (
              <>
                Let's Go! 🚀
              </>
            ) : (
              <>
                Next Step
                <span className="material-symbols-outlined text-[12px] font-bold">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
