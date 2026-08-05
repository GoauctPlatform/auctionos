import React from 'react';
import { useLanguage, Language } from '../context/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const getFlag = (lang: Language) => {
    switch (lang) {
      case 'en': return '🇺🇸';
      case 'es': return '🇪🇸';
      case 'pt': return '🇧🇷';
      default: return '🇺🇸';
    }
  };

  const getTitle = (lang: Language) => {
    switch (lang) {
      case 'en': return 'English';
      case 'es': return 'Español';
      case 'pt': return 'Português';
      default: return 'English';
    }
  };

  return (
    <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
      {(['en', 'es', 'pt'] as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`flex items-center justify-center size-7 rounded-lg transition-all duration-200 ${
            language === lang
              ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60 scale-105'
              : 'text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 opacity-70 hover:opacity-100 border border-transparent'
          }`}
          title={getTitle(lang)}
        >
          <span className="text-lg leading-none select-none filter drop-shadow-sm">{getFlag(lang)}</span>
        </button>
      ))}
    </div>
  );
};
