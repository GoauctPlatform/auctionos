import React from 'react';
import Header from '../components/Header';
import { Footer } from '../components/Footer';

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
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Legal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          Terms of Service
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Last updated: March 2026
        </p>
      </div>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing and using this website, you accept and agree to be bound by the terms
          and provision of this agreement. In addition, when using this website's particular
          services, you shall be subject to any posted guidelines or rules applicable to such
          services. These terms apply to all visitors, users, and others who access or use the
          GoAuct platform.
        </p>
      </Section>

      <Section title="2. Use of License">
        <p>
          Permission is granted to temporarily access and use the GoAuct platform for
          personal, non-commercial purposes only. This is the grant of a license, not a
          transfer of title, and under this license you may not:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Modify or copy the materials</li>
          <li>Use the materials for any commercial purpose or for any public display</li>
          <li>Attempt to decompile or reverse engineer any software</li>
          <li>Remove any copyright or proprietary notations from the materials</li>
          <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
        </ul>
      </Section>

      <Section title="3. Data Usage">
        <p>
          Property data, auction schedules, and related information available on this platform
          are sourced from public records and third-party providers. GoAuct provides this
          data as-is and makes no warranty as to its accuracy or completeness. All data must be
          independently verified before reliance.
        </p>
      </Section>

      <Section title="4. User Accounts">
        <p>
          When you create an account with us, you must provide accurate, complete, and current
          information. You are responsible for safeguarding your account password and for any
          activities that occur under your account. You must notify us immediately upon becoming
          aware of any breach of security or unauthorized use of your account.
        </p>
      </Section>

      <Section title="5. Prohibited Activities">
        <p>You agree not to engage in any of the following activities:</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Using the service for any unlawful purpose or in violation of any regulations</li>
          <li>Attempting to gain unauthorized access to any part of the platform</li>
          <li>Scraping or harvesting data from the platform without prior written consent</li>
          <li>Interfering with or disrupting the integrity or performance of the service</li>
        </ul>
      </Section>

      <Section title="6. Disclaimer">
        <p>
          The materials on GoAuct's website are provided on an 'as is' basis. GoAuct
          makes no warranties, expressed or implied, and hereby disclaims and negates all other
          warranties including, without limitation, implied warranties or conditions of
          merchantability, fitness for a particular purpose, or non-infringement of intellectual
          property or other violation of rights.
        </p>
      </Section>

      <Section title="7. Limitations">
        <p>
          In no event shall GoAuct or its suppliers be liable for any damages (including,
          without limitation, damages for loss of data or profit, or due to business
          interruption) arising out of the use or inability to use the materials on GoAuct's
          website.
        </p>
      </Section>

      <Section title="8. Governing Law">
        <p>
          These terms and conditions are governed by and construed in accordance with the laws
          of the United States, and you irrevocably submit to the exclusive jurisdiction of the
          courts in that jurisdiction.
        </p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>
          GoAuct reserves the right to modify these terms at any time. We will provide
          notice of significant changes. Your continued use of the platform after changes
          are posted constitutes your acceptance of the modified terms.
        </p>
      </Section>

      <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
        Questions about these Terms? Contact us at{' '}
        <a href="mailto:support@goauct.com" className="text-primary hover:underline">
          support@goauct.com
        </a>
      </div>
    </div>
  );

  if (!standalone) {
    return <div className="p-1 sm:p-2 max-w-4xl mx-auto w-full">{content}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {content}
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
