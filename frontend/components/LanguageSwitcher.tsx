import React from 'react';
import { useLanguage, Language } from '../context/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
      {(['en', 'es', 'pt'] as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
            language === lang
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
          title={lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Português'}
        >
          {lang}
        </button>
      ))}
    </div>
  );
};
