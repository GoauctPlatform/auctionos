import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import enDict from '../locales/en.json';
import esDict from '../locales/es.json';
import ptDict from '../locales/pt.json';

export type Language = 'en' | 'es' | 'pt';

const STORAGE_KEY = 'goauct_language';

const dicts: Record<Language, Record<string, any>> = {
  en: enDict as Record<string, any>,
  es: esDict as Record<string, any>,
  pt: ptDict as Record<string, any>,
};

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && ['en', 'es', 'pt'].includes(saved)) return saved;
  } catch {}
  const browserLang = (navigator.language || '').toLowerCase();
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
}

function resolve(dict: Record<string, any>, key: string): string {
  const parts = key.split('.');
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English
      let fb: any = dicts.en;
      for (const p of parts) {
        if (fb && typeof fb === 'object' && p in fb) {
          fb = fb[p];
        } else {
          return key;
        }
      }
      return typeof fb === 'string' ? fb : key;
    }
  }
  return typeof current === 'string' ? current : key;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    return resolve(dicts[language], key);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
