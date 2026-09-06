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

const TermsOfServicePage: React.FC<LegalPageProps> = ({ standalone = true }) => {
    const { t } = useLanguage();
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t('TermsOfServicePage.legal')}</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          {t('TermsOfServicePage.termsOfService')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          {t('TermsOfServicePage.lastUpdatedMarch2026')}</p>
      </div>

      <Section title="1. Acceptance of Terms">
        <p>
          {t('TermsOfServicePage.byAccessingAndUsingT')}</p>
      </Section>

      <Section title="2. Use of License">
        <p>
          {t('TermsOfServicePage.permissionIsGrantedT')}</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>{t('TermsOfServicePage.modifyOrCopyTheMater')}</li>
          <li>{t('TermsOfServicePage.useTheMaterialsForAn')}</li>
          <li>{t('TermsOfServicePage.attemptToDecompileOr')}</li>
          <li>{t('TermsOfServicePage.removeAnyCopyrightOr')}</li>
          <li>{t('TermsOfServicePage.transferTheMaterials')}</li>
        </ul>
      </Section>

      <Section title="3. Data Usage">
        <p>
          {t('TermsOfServicePage.propertyDataAuctionS')}</p>
      </Section>

      <Section title="4. User Accounts">
        <p>
          {t('TermsOfServicePage.whenYouCreateAnAccou')}</p>
      </Section>

      <Section title="5. Prohibited Activities">
        <p>{t('TermsOfServicePage.youAgreeNotToEngageI')}</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>{t('TermsOfServicePage.usingTheServiceForAn')}</li>
          <li>{t('TermsOfServicePage.attemptingToGainUnau')}</li>
          <li>{t('TermsOfServicePage.scrapingOrHarvesting')}</li>
          <li>{t('TermsOfServicePage.interferingWithOrDis')}</li>
        </ul>
      </Section>

      <Section title="6. Disclaimer">
        <p>
          {t('TermsOfServicePage.theMaterialsOnGoAuct')}</p>
      </Section>

      <Section title="7. Limitations">
        <p>
          {t('TermsOfServicePage.inNoEventShallGoAuct')}</p>
      </Section>

      <Section title="8. Governing Law">
        <p>
          {t('TermsOfServicePage.theseTermsAndConditi')}</p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>
          {t('TermsOfServicePage.goAuctReservesTheRig')}</p>
      </Section>

      <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
        {t('TermsOfServicePage.questionsAboutTheseT')}{' '}
        <a href="mailto:support@goauct.com" className="text-primary hover:underline">
          {t('TermsOfServicePage.supportGoauctCom')}</a>
      </div>
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

export default TermsOfServicePage;
