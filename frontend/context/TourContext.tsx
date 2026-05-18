import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  path: string;
}

interface TourContextType {
  tourActive: boolean;
  activeStep: number;
  steps: TourStep[];
  startTour: (type: 'investor' | 'live_auctions' | 'property_details') => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  tourType: 'investor' | 'live_auctions' | 'property_details' | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const PROPERTY_DETAILS_TOUR_STEPS: TourStep[] = [
  {
    target: '#tour-property-basic-info',
    title: 'Basic Property Data 🏠',
    content: 'View essential structural details, parcel identifiers, owner names, building years, and tax assessment valuations gathered from local county registries.',
    path: 'any'
  },
  {
    target: '#btn-customize-property-view',
    title: 'Customize Your Research 🎨',
    content: 'Click here to unlock the Overrides Panel. You can customize descriptions, update building parameters, or adjust calculated yields based on your field findings.',
    path: 'any'
  },
  {
    target: '#tour-property-financials',
    title: 'Yields & Estimated Values 💰',
    content: 'Compare our automated ARV calculations, monthly rent estimates, deal scores, and potential secondary BPO combo acquisition offers instantly.',
    path: 'any'
  },
  {
    target: '#tour-property-maps',
    title: 'Street View & Map Placement 🗺️',
    content: 'Inspect actual property conditions remotely. Explore local streets, locate county pins, and evaluate structural neighborhood risks visually.',
    path: 'any'
  },
  {
    target: '#tour-property-research-links',
    title: 'Pre-populated County Portals 🔗',
    content: 'Jump straight to local resources with one click. We pre-fill parcel searches on tax assessors, deed records, tax collectors, and GIS maps.',
    path: 'any'
  },
  {
    target: '#tour-property-actions',
    title: 'Team Collaboration & Watchlists ⚙️',
    content: 'Write private company notes, upload structural attachments, or add this property to your primary watchlists to keep the whole team aligned in real-time.',
    path: 'any'
  },
  {
    target: 'none',
    title: 'Tour Complete! 🎯',
    content: 'You now know how to leverage GoAuct\'s property analytics. Start customizing views, taking notes, or deploying field missions now!',
    path: 'any'
  }
];

export const INVESTOR_TOUR_STEPS: TourStep[] = [
  {
    target: '#tour-welcome-header',
    title: 'Welcome to GoAuct Mission Control 🚀',
    content: 'This is your main dashboard. Everything you need is aggregated here in real-time to organize and track your distress property investments.',
    path: '/client'
  },
  {
    target: '#tour-announcements',
    title: 'Live News & Alerts 📢',
    content: 'Stay updated with dynamic announcements, state deadline changes, and system release logs directly from compliance.',
    path: '/client'
  },
  {
    target: '#tour-yield-heatmap',
    title: 'National Yield Heatmap 🗺️',
    content: 'Get bird\'s-eye regional geographic intelligence. Hover to check deal volumes, and tap on any state to filter suggested deals instantly.',
    path: '/client'
  },
  {
    target: '#tour-suggested-deals',
    title: 'AI Suggested Top Deals 🧠',
    content: 'Our deal-scoring engines grade properties from A+ down to C based on delinquent tax margins, equity values, and local market safety.',
    path: '/client'
  },
  {
    target: '#tour-nav-property-search',
    title: 'Property Search Navigation 🔍',
    content: 'Access our database containing over 500,000 delinquent and distressed assets. Let\'s head there to see how we filter them!',
    path: '/client'
  },
  {
    target: '#tour-properties-filters',
    title: 'Refined Real Estate Explorer 🎯',
    content: 'Filter listings by state, county, zip code, acreage, building sizes, or direct tax bid values to isolate highly profitable opportunities.',
    path: '/client/properties'
  },
  {
    target: '#tour-nav-my-lists',
    title: 'Personalized Watchlists 📁',
    content: 'Save distressed properties, track BPOs, and organize your investment pipeline. Let\'s check out your watchlists!',
    path: '/client/properties'
  },
  {
    target: '#tour-lists-folders',
    title: 'Watchlist Folder Silos 📂',
    content: 'Organize properties by state and county automatically. Write private shared notes, view state silhouttes, and collaborate in real-time.',
    path: '/client/lists'
  },
  {
    target: '#tour-nav-field-missions',
    title: 'Field Team Operations 🚗',
    content: 'Need localized visual check-ups on distressed homes? Coordinate certified field runners to verify physical structures.',
    path: '/client/lists'
  },
  {
    target: '#tour-missions-dashboard',
    title: 'Field Missions Control 📋',
    content: 'Deploy runners, track on-site condition questionnaires, and verify occupant risk or property damage in real-time.',
    path: '/client/tasks'
  },
  {
    target: '#tour-nav-account-settings',
    title: 'Workspace Settings & Team ⚙️',
    content: 'Configure your active company profile, manage teammates (Managers & Agents), and check API usage logs.',
    path: '/client/tasks'
  },
  {
    target: '#tour-upgrade-button',
    title: 'Linear Telemetry & Upgrades 💳',
    content: 'Track monthly search quotas and team limit linear bars in real-time. Upgrade securely via Stripe links to unlock unlimited research scope.',
    path: '/client/settings'
  },
  {
    target: 'none',
    title: 'You\'re Fully Equipped! 🎉',
    content: 'Congratulations! You have completed your technical tour of GoAuct. You are ready to locate, verify, and lock in the best distress properties!',
    path: '/client'
  }
];

export const LIVE_AUCTIONS_TOUR_STEPS: TourStep[] = [
  {
    target: '#tour-nav-live-auctions',
    title: 'Live Auctions Portal 🔨',
    content: 'Welcome to your premium Live Auctions chamber! Now that you are on a paid plan, you have unlocked real-time bidding calendars.',
    path: '/client/auctions'
  },
  {
    target: '#tour-auctions-calendar',
    title: 'Premium Auction Calendar 📅',
    content: 'Track upcoming deed, foreclosure, or tax lien auctions day-by-day across all US counties. Stay synchronized with bidding times easily.',
    path: '/client/auctions'
  },
  {
    target: '#tour-auctions-filters',
    title: 'County Registry Connectors 🔗',
    content: 'Filter scheduled events by state, count parcels scheduled under the gavel, and click straight to official county platforms to submit bids.',
    path: '/client/auctions'
  }
];

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tourActive, setTourActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [tourType, setTourType] = useState<'investor' | 'live_auctions' | 'property_details' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const steps = tourType === 'live_auctions' 
    ? LIVE_AUCTIONS_TOUR_STEPS 
    : tourType === 'property_details' 
      ? PROPERTY_DETAILS_TOUR_STEPS 
      : INVESTOR_TOUR_STEPS;

  const startTour = (type: 'investor' | 'live_auctions' | 'property_details') => {
    setTourType(type);
    setActiveStep(0);
    setTourActive(true);
    
    // Automatically redirect to the starting page of the tour
    const startStep = type === 'live_auctions' 
      ? LIVE_AUCTIONS_TOUR_STEPS[0] 
      : type === 'property_details' 
        ? PROPERTY_DETAILS_TOUR_STEPS[0] 
        : INVESTOR_TOUR_STEPS[0];
    if (startStep.path !== 'any' && location.pathname !== startStep.path) {
      navigate(startStep.path);
    }
  };

  const endTour = () => {
    setTourActive(false);
    const user = AuthService.getCurrentUser();
    if (user) {
      if (tourType === 'live_auctions') {
        localStorage.setItem(`goauct_live_auctions_tour_completed_${user.id}`, 'true');
      } else if (tourType === 'property_details') {
        localStorage.setItem(`goauct_property_details_tour_completed_${user.id}`, 'true');
      } else {
        localStorage.setItem(`goauct_onboarding_completed_${user.id}`, 'true');
      }
    }
    setTourType(null);
  };

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      const nextIdx = activeStep + 1;
      const nextTarget = steps[nextIdx];
      
      setActiveStep(nextIdx);
      
      // Auto-navigate to correct page for the step
      if (location.pathname !== nextTarget.path && nextTarget.path !== 'any') {
        navigate(nextTarget.path);
      }
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      const prevIdx = activeStep - 1;
      const prevTarget = steps[prevIdx];
      
      setActiveStep(prevIdx);
      
      if (location.pathname !== prevTarget.path && prevTarget.path !== 'any') {
        navigate(prevTarget.path);
      }
    }
  };

  return (
    <TourContext.Provider value={{ tourActive, activeStep, steps, startTour, nextStep, prevStep, endTour, tourType }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
