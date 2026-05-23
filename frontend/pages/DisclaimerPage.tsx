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

const DisclaimerPage: React.FC<LegalPageProps> = ({ standalone = true }) => {
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Legal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          Disclaimer
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Last updated: March 2026
        </p>
      </div>

      <Section title="General Disclaimer">
        <p>
          The information contained on this website is for general information purposes only.
          The information is provided by GoAuct and while we endeavour to keep the
          information up to date and correct, we make no representations or warranties of any
          kind, express or implied, about the completeness, accuracy, reliability, suitability
          or availability with respect to the website or the information, products, services, or
          related graphics contained on the website for any purpose.
        </p>
        <p>
          Any reliance you place on such information is therefore strictly at your own risk.
        </p>
      </Section>

      <Section title="Real Estate Information">
        <p>
          Property information and data provided on this platform, including but not limited to
          auction dates, property details, and values, are derived from third-party sources and
          public records. GoAuct does not guarantee the accuracy of this data.
        </p>
        <p>
          Users are strongly advised to perform their own due diligence, consult with legal and
          financial professionals, and independently verify all information before making any
          investment decisions. Any reliance you place on such information is therefore strictly
          at your own risk.
        </p>
      </Section>

      <Section title="Investment Risk">
        <p>
          Real estate investing involves substantial risk, including the possible loss of
          principal. Past performance is not necessarily indicative of future results.
          Information provided on this platform should not be construed as investment advice.
          Always consult with a licensed real estate professional, attorney, or financial
          advisor before making investment decisions.
        </p>
      </Section>

      <Section title="Third-Party Data">
        <p>
          GoAuct aggregates data from public county records, government databases, and
          third-party data providers. We strive to maintain accuracy but cannot guarantee
          real-time correctness. Auction dates, property statuses, and ownership records
          can change without notice. Users should verify all details directly with the
          relevant county or government authority.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          In no event will GoAuct be liable for any loss or damage including without
          limitation, indirect or consequential loss or damage, or any loss or damage
          whatsoever arising from loss of data or profits arising out of, or in connection
          with, the use of this website.
        </p>
      </Section>

      <div className="mt-10 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
        <span className="font-semibold">Note:</span> This disclaimer may be updated from time
        to time. Continued use of the platform constitutes acceptance of the most current
        version.
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

export default DisclaimerPage;
