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

const PrivacyPolicyPage: React.FC<LegalPageProps> = ({ standalone = true }) => {
    const { t } = useLanguage();
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t('PrivacyPolicyPage.legal')}</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          {t('PrivacyPolicyPage.privacyPolicy')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          {t('PrivacyPolicyPage.lastUpdatedMarch2026')}</p>
      </div>

      <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
        {t('PrivacyPolicyPage.yourPrivacyIsImporta')}</p>

      <Section title="Information We Collect">
        <p>
          {t('PrivacyPolicyPage.weOnlyAskForPersonal')}</p>
        <p>{t('PrivacyPolicyPage.informationWeMayColl')}</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>{t('PrivacyPolicyPage.nameAndContactInform')}</li>
          <li>{t('PrivacyPolicyPage.accountCredentialsEm')}</li>
          <li>{t('PrivacyPolicyPage.usageDataAndPlatform')}</li>
          <li>{t('PrivacyPolicyPage.savedSearchesWatchli')}</li>
          <li>{t('PrivacyPolicyPage.paymentInformationPr')}</li>
        </ul>
      </Section>

      <Section title="How We Use Your Information">
        <p>
          {t('PrivacyPolicyPage.weOnlyRetainCollecte')}</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>{t('PrivacyPolicyPage.toProvideMaintainAnd')}</li>
          <li>{t('PrivacyPolicyPage.toProcessTransaction')}</li>
          <li>{t('PrivacyPolicyPage.toRespondToSupportRe')}</li>
          <li>{t('PrivacyPolicyPage.toComplyWithLegalObl')}</li>
        </ul>
      </Section>

      <Section title="Information Sharing">
        <p>
          {t('PrivacyPolicyPage.weDonTShareAnyPerson')}</p>
      </Section>

      <Section title="Cookies and Tracking">
        <p>
          {t('PrivacyPolicyPage.weUseCookiesAndSimil')}</p>
      </Section>

      <Section title="Data Security">
        <p>
          {t('PrivacyPolicyPage.theSecurityOfYourDat')}</p>
      </Section>

      <Section title="Your Rights">
        <p>{t('PrivacyPolicyPage.youHaveTheRightTo')}</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>{t('PrivacyPolicyPage.accessThePersonalInf')}</li>
          <li>{t('PrivacyPolicyPage.requestCorrectionOfI')}</li>
          <li>{t('PrivacyPolicyPage.requestDeletionOfYou')}</li>
          <li>{t('PrivacyPolicyPage.objectToProcessingOf')}</li>
          <li>{t('PrivacyPolicyPage.requestRestrictionOf')}</li>
          <li>{t('PrivacyPolicyPage.requestTransferOfYou')}</li>
        </ul>
      </Section>

      <Section title="Changes to This Policy">
        <p>
          {t('PrivacyPolicyPage.weMayUpdateOurPrivac')}</p>
      </Section>

      <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
        {t('PrivacyPolicyPage.questionsAboutYourPr')}{' '}
        <a href="mailto:privacy@goauct.com" className="text-primary hover:underline">
          {t('PrivacyPolicyPage.privacyGoauctCom')}</a>
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

export default PrivacyPolicyPage;
