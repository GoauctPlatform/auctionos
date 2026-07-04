import React from 'react';

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
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Legal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
          Privacy Policy
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Last updated: March 2026
        </p>
      </div>

      <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
        Your privacy is important to us. It is GoAuct's policy to respect your privacy
        regarding any information we may collect from you across our website and other services
        we own and operate. This policy explains what information we collect, how we use it,
        and what rights you have in relation to it.
      </p>

      <Section title="Information We Collect">
        <p>
          We only ask for personal information when we truly need it to provide a service to
          you. We collect it by fair and lawful means, with your knowledge and consent. We also
          let you know why we're collecting it and how it will be used.
        </p>
        <p>Information we may collect includes:</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Name and contact information (email, phone number)</li>
          <li>Account credentials (email/username)</li>
          <li>Usage data and platform activity logs</li>
          <li>Saved searches, watchlists, and property notes</li>
          <li>Payment information (processed securely via third-party providers)</li>
        </ul>
      </Section>

      <Section title="How We Use Your Information">
        <p>
          We only retain collected information for as long as necessary to provide you with your
          requested service. What data we store, we protect within commercially acceptable means
          to prevent loss and theft, as well as unauthorized access, disclosure, copying, use,
          or modification.
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>To provide, maintain, and improve our platform</li>
          <li>To process transactions and send service-related notifications</li>
          <li>To respond to support requests and inquiries</li>
          <li>To comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="Information Sharing">
        <p>
          We don't share any personally identifying information publicly or with third-parties,
          except when required to by law or when you have given explicit consent. We may share
          anonymized, aggregated data that cannot reasonably be used to identify you.
        </p>
      </Section>

      <Section title="Cookies and Tracking">
        <p>
          We use cookies and similar tracking technologies to track activity on our platform and
          store certain information. You can instruct your browser to refuse all cookies or to
          indicate when a cookie is being sent. However, if you do not accept cookies, you may
          not be able to use some portions of our service.
        </p>
      </Section>

      <Section title="Data Security">
        <p>
          The security of your data is important to us. We use commercially reasonable security
          measures to protect your personal information. However, no method of transmission
          over the internet or method of electronic storage is 100% secure. While we strive to
          use commercially acceptable means to protect your personal data, we cannot guarantee
          its absolute security.
        </p>
      </Section>

      <Section title="Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate or incomplete data</li>
          <li>Request deletion of your personal data</li>
          <li>Object to processing of your personal data</li>
          <li>Request restriction of processing your personal data</li>
          <li>Request transfer of your personal data</li>
        </ul>
      </Section>

      <Section title="Changes to This Policy">
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes
          by posting the new Privacy Policy on this page. We will update the "Last updated"
          date at the top of this page. Your continued use of the platform after changes are
          posted constitutes your acceptance of the updated policy.
        </p>
      </Section>

      <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
        Questions about your privacy? Contact our Data Protection team at{' '}
        <a href="mailto:privacy@goauct.com" className="text-primary hover:underline">
          privacy@goauct.com
        </a>
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
