import React from 'react';
import { useLanguage } from "../context/LanguageContext";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
      {title}
    </h2>
    <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">{children}</div>
  </div>
);

interface LegalPageProps {
  standalone?: boolean;
}

const DisclaimerPage: React.FC<LegalPageProps> = ({ standalone = true }) => {
    const { t } = useLanguage();
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t('DisclaimerPage.legal')}</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          {t('DisclaimerPage.disclaimer')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          {t('DisclaimerPage.lastUpdatedMarch2026')}</p>
      </div>

      <Section title="General Disclaimer">
        <p>
          {t('DisclaimerPage.theInformationContai')}</p>
        <p>
          {t('DisclaimerPage.anyRelianceYouPlaceO')}</p>
      </Section>

      <Section title="Real Estate Information">
        <p>
          {t('DisclaimerPage.propertyInformationA')}</p>
        <p>
          {t('DisclaimerPage.usersAreStronglyAdvi')}</p>
      </Section>

      <Section title="Investment Risk">
        <p>
          {t('DisclaimerPage.realEstateInvestingI')}</p>
      </Section>

      <Section title="Third-Party Data">
        <p>
          {t('DisclaimerPage.goAuctAggregatesData')}</p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          {t('DisclaimerPage.inNoEventWillGoAuctB')}</p>
      </Section>

      <div className="mt-10 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
        <span className="font-semibold">{t('DisclaimerPage.note')}</span> {t('DisclaimerPage.thisDisclaimerMayBeU')}</div>
    </div>
  );

  if (!standalone) {
    return <div className="p-1 sm:p-2 max-w-4xl mx-auto w-full">{content}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans pt-24 pb-12">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4">
        {content}
      </main>
    </div>
  );
};

export default DisclaimerPage;
