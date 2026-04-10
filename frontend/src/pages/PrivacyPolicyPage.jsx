import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'svetli5254@gmail.com'; // ← update with your contact email
const LAST_UPDATED = '10 April 2026';

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-bold">{title}</h2>
    {children}
  </section>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-10">
        <Link to="/" className="text-xl font-extrabold text-brand-600">The People Book</Link>
        <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-full bg-brand-600 text-white hover:bg-brand-700 transition-colors">Join free</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-10 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
          <p className="text-gray-400 text-xs">Last updated: {LAST_UPDATED}</p>
        </div>

        <p>
          This Privacy Policy explains how The People Book ("we", "us", "our") collects, uses, stores, and
          protects your personal data when you use our service. We are committed to full compliance with the
          EU General Data Protection Regulation (GDPR) and the ePrivacy Directive.
        </p>

        <Section title="1. Data Controller">
          <p>
            The data controller responsible for your personal data is The People Book. For any data-related
            requests, contact us at: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p>We collect only the data necessary to provide the service:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> username, email address, full name (optional), profile photo (optional), bio (optional)</li>
            <li><strong>Authentication data:</strong> hashed password (we never store your password in plaintext) or Google account ID for OAuth users</li>
            <li><strong>Content you create:</strong> posts, comments, messages, stories, and any media you upload</li>
            <li><strong>Social graph:</strong> who you follow and who follows you</li>
            <li><strong>Session data:</strong> a secure, HttpOnly authentication cookie used to keep you logged in</li>
            <li><strong>Technical logs:</strong> server-side error logs for debugging (no personal data retained beyond 7 days)</li>
          </ul>
          <p>We do <strong>not</strong> collect: IP addresses for profiling, device fingerprints, browsing history, or any data for advertising purposes.</p>
        </Section>

        <Section title="3. Legal Basis for Processing (GDPR Article 6)">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract performance (Art. 6(1)(b)):</strong> Processing your account data and content to provide the service you signed up for</li>
            <li><strong>Consent (Art. 6(1)(a)):</strong> Sending you notifications (you can withdraw consent at any time in your settings)</li>
            <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> Security logging and fraud prevention</li>
          </ul>
        </Section>

        <Section title="4. Cookies and Local Storage">
          <p>We use the following strictly necessary technologies:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Name</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Type</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Purpose</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Expires</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">refresh_token</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">HttpOnly Cookie</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Keeps you securely logged in between sessions</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">30 days</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">auth (localStorage)</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Local Storage</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Stores short-lived access token (15 minutes)</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Session</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">theme (localStorage)</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Local Storage</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Remembers your light/dark mode preference</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Persistent</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            All cookies above are <strong>strictly necessary</strong> for the service to function. Under the
            ePrivacy Directive, strictly necessary cookies do not require consent. We do not use any
            analytics, advertising, or tracking cookies.
          </p>
        </Section>

        <Section title="5. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-1">
            <li>To create and manage your account</li>
            <li>To display your content to other users according to your settings</li>
            <li>To send you in-app notifications about activity on your account</li>
            <li>To enable real-time messaging with other users</li>
            <li>To prevent abuse and maintain service security</li>
          </ul>
          <p>We will <strong>never</strong> sell, rent, or share your data with third parties for commercial purposes.</p>
        </Section>

        <Section title="6. Data Retention">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> retained until you delete your account</li>
            <li><strong>Posts, comments, messages:</strong> deleted immediately and permanently when you delete your account</li>
            <li><strong>Session tokens:</strong> automatically expire or are revoked on logout</li>
            <li><strong>Error logs:</strong> retained for a maximum of 7 days</li>
          </ul>
        </Section>

        <Section title="7. Your Rights Under GDPR">
          <p>As a data subject under GDPR, you have the following rights, exercisable free of charge:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Right of access (Art. 15):</strong> Request a copy of all personal data we hold about you. Use the "Export my data" button in your profile settings.</li>
            <li><strong>Right to rectification (Art. 16):</strong> Correct inaccurate data via your profile edit page.</li>
            <li><strong>Right to erasure / "right to be forgotten" (Art. 17):</strong> Delete your account and all associated data permanently via Settings → Delete account.</li>
            <li><strong>Right to data portability (Art. 20):</strong> Download your data in a machine-readable JSON format from your profile settings.</li>
            <li><strong>Right to restrict processing (Art. 18):</strong> Contact us to request restriction of processing while a dispute is resolved.</li>
            <li><strong>Right to object (Art. 21):</strong> Object to processing based on legitimate interests by contacting us.</li>
            <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
          </ul>
          <p>
            To exercise any right, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>.
            We will respond within 30 days as required by GDPR Article 12.
          </p>
        </Section>

        <Section title="8. Data Security">
          <ul className="list-disc pl-5 space-y-1">
            <li>Passwords are hashed using bcrypt (cost factor 12) — we cannot read your password</li>
            <li>Session refresh tokens are stored as SHA-256 hashes in the database</li>
            <li>Authentication cookies are HttpOnly and SameSite=Lax, preventing XSS and CSRF attacks</li>
            <li>All inter-service communication is within a private Docker network</li>
            <li>The database port is not exposed to the internet</li>
          </ul>
        </Section>

        <Section title="9. International Transfers">
          <p>
            We do not transfer your personal data outside the European Economic Area (EEA). All data is
            processed and stored within EEA-based infrastructure.
          </p>
        </Section>

        <Section title="10. Third-Party Services">
          <p>
            The only optional third-party integration is <strong>Google Sign-In (OAuth 2.0)</strong>. If you
            choose to log in with Google, Google's{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
              Privacy Policy
            </a>{' '}
            applies to the authentication step. We receive only your name, email address, and Google account
            ID from Google. We do not receive or store any Google tokens.
          </p>
        </Section>

        <Section title="11. Complaints">
          <p>
            If you believe we are processing your data unlawfully, you have the right to lodge a complaint
            with your national data protection authority. In Bulgaria, this is the{' '}
            <a href="https://www.cpdp.bg" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
              Commission for Personal Data Protection (CPDP)
            </a>.
            You can also contact the lead supervisory authority in your EU member state.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this policy to reflect changes in the law or our practices. We will notify
            registered users by in-app notification at least 30 days before material changes take effect.
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
