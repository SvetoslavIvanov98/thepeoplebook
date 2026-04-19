import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'svetli5254@gmail.com';
const LAST_UPDATED = '10 April 2026';

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-bold">{title}</h2>
    {children}
  </section>
);

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-10">
        <Link to="/" className="text-xl font-extrabold text-brand-600">The People Book</Link>
        <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-full bg-brand-600 text-white hover:bg-brand-700 transition-colors">Join free</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-10 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Terms of Service</h1>
          <p className="text-gray-400 text-xs">Last updated: {LAST_UPDATED}</p>
        </div>

        <p>
          These Terms of Service ("Terms") govern your use of The People Book ("the Platform", "we", "us").
          By creating an account or using the Platform you agree to these Terms. If you do not agree, do not use the Platform.
        </p>

        <Section title="1. Eligibility">
          <p>
            You must be at least <strong>16 years old</strong> to create an account. By registering you confirm that
            you meet this age requirement. We verify your date of birth during registration as required by
            Article 8 of the EU General Data Protection Regulation (GDPR).
          </p>
        </Section>

        <Section title="2. Your Account">
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for keeping your login credentials secure.</li>
            <li>You must provide accurate information when registering.</li>
            <li>You may delete your account at any time, which permanently removes all your data.</li>
          </ul>
        </Section>

        <Section title="3. Acceptable Use">
          <p>When using the Platform you must not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Post illegal content, including but not limited to content that incites violence, constitutes hate speech, or infringes intellectual property rights.</li>
            <li>Harass, bully, or threaten other users.</li>
            <li>Distribute spam, malware, or deceptive content.</li>
            <li>Impersonate another person or entity.</li>
            <li>Attempt to circumvent security measures or access other users' accounts.</li>
            <li>Use automated tools to scrape content or create accounts.</li>
          </ul>
        </Section>

        <Section title="4. Content You Post">
          <p>
            You retain ownership of content you post. By posting content on the Platform, you grant us a limited,
            non-exclusive licence to display, distribute, and store your content solely for the purpose of operating
            the Platform. This licence ends when you delete the content or your account.
          </p>
        </Section>

        <Section title="5. Content Moderation (EU Digital Services Act)">
          <p>
            In accordance with Regulation (EU) 2022/2065 (the Digital Services Act), we provide the following:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Reporting mechanism:</strong> Any user can report content they believe is illegal or violates these Terms using the report button available on posts and comments.</li>
            <li><strong>Statement of reasons:</strong> When we take action against content or an account, we provide the affected user with a clear statement of reasons explaining the decision, the facts, the legal basis, and the action taken.</li>
            <li><strong>Appeal mechanism:</strong> If you disagree with a moderation decision, you can appeal through your account. Appeals are reviewed by a different moderator where possible.</li>
          </ul>
          <p>
            We aim to process reports within a reasonable timeframe and will notify reporters of the outcome.
          </p>
        </Section>

        <Section title="6. Account Suspension and Termination">
          <p>
            We may suspend or terminate your account if you violate these Terms. Before doing so, we will
            provide you with a statement of reasons. You may appeal any suspension decision through the
            appeals process described above.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            The Platform is provided "as is" without warranties of any kind. To the maximum extent permitted
            by applicable law, we are not liable for any indirect, incidental, or consequential damages arising
            from your use of the Platform.
          </p>
        </Section>

        <Section title="8. Privacy">
          <p>
            Your privacy is important to us. Please review our{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline font-medium">Privacy Policy</Link>{' '}
            for details on how we collect, use, and protect your personal data.
          </p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify registered users by in-app notification
            at least 30 days before material changes take effect. Continued use of the Platform after changes
            take effect constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            For questions about these Terms, contact us at:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of Bulgaria
            and applicable European Union law.
          </p>
        </Section>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-gray-400 text-xs">
          <p>Questions? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a></p>
          <p className="mt-2"><Link to="/" className="hover:text-brand-600">← Back to home</Link></p>
        </div>
      </main>
    </div>
  );
}
