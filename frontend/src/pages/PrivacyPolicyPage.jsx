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
          protects your personal data when you use our service. We aim to handle your data in accordance with
          the EU General Data Protection Regulation (GDPR) and the ePrivacy Directive. Where our practices are
          still being improved, we note that below.
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
            <li><strong>Account data:</strong> username, email address, date of birth, full name (optional), profile photo (optional), bio (optional)</li>
            <li><strong>Authentication data:</strong> hashed password (we never store your password in plaintext) or Google account ID for OAuth users</li>
            <li><strong>Content you create:</strong> posts, comments, messages, stories, and any media you upload</li>
            <li><strong>Social graph:</strong> who you follow and who follows you, blocks, and mutes</li>
            <li><strong>Session data:</strong> a secure, HttpOnly authentication cookie used to keep you logged in</li>
            <li><strong>Push tokens:</strong> if you use the mobile app, we store Expo push notification tokens to deliver notifications to your device</li>
          </ul>
          <p>We do <strong>not</strong> collect: IP addresses for profiling, device fingerprints, browsing history, or any data for advertising purposes.</p>
        </Section>

        <Section title="3. Legal Basis for Processing (GDPR Article 6)">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract performance (Art. 6(1)(b)):</strong> Processing your account data and content to provide the service you signed up for</li>
            <li><strong>Consent (Art. 6(1)(a)):</strong> Sending you push notifications on the mobile app (you control this via your device's notification settings)</li>
            <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> Security logging and fraud prevention</li>
          </ul>
        </Section>

        <Section title="4. Cookies and Local Storage (ePrivacy)">
          <p>We use the following browser storage technologies:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Name</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Type</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Purpose</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Category</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Expires</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">refresh_token</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">HttpOnly Cookie</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Keeps you securely logged in between sessions</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Strictly necessary</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">30 days</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">auth</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Local Storage</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Stores short-lived access token</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Strictly necessary</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Session</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">theme</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Local Storage</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Remembers your light/dark mode preference</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Preference</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Persistent</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono">cookie_notice_acknowledged</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Local Storage</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Records that you have seen the cookie/storage notice</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Strictly necessary</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-3 py-2">Persistent</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The <strong>refresh_token</strong> cookie, <strong>auth</strong> token, and <strong>cookie_notice_acknowledged</strong> flag
            are strictly necessary for the service to function and do not require consent under the ePrivacy Directive.
            The <strong>theme</strong> preference is a user-experience enhancement; it stores only your light/dark
            mode choice and contains no personal data.
          </p>
          <p>We do not use any analytics, advertising, or tracking cookies.</p>
        </Section>

        <Section title="5. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-1">
            <li>To create and manage your account</li>
            <li>To display your content to other users according to your settings</li>
            <li>To send you in-app and push notifications about activity on your account</li>
            <li>To enable real-time messaging with other users</li>
            <li>To prevent abuse and maintain service security</li>
            <li>To process content reports and enforce our <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link></li>
          </ul>
          <p>We will <strong>never</strong> sell, rent, or share your data with third parties for commercial purposes.</p>
        </Section>

        <Section title="6. Data Retention">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> retained until you delete your account</li>
            <li><strong>Posts, comments, messages:</strong> deleted immediately and permanently when you delete your account</li>
            <li><strong>Session tokens:</strong> automatically expire or are revoked on logout</li>
            <li><strong>Content reports:</strong> retained for audit purposes even after account deletion</li>
          </ul>
        </Section>

        <Section title="7. Your Rights Under GDPR">
          <p>As a data subject under GDPR, you have the following rights, exercisable free of charge:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Right of access (Art. 15):</strong> Request a copy of all personal data we hold about you. Use the "Export my data" button in your profile settings.</li>
            <li><strong>Right to rectification (Art. 16):</strong> Correct inaccurate data via your profile edit page.</li>
            <li><strong>Right to erasure / "right to be forgotten" (Art. 17):</strong> Delete your account and all associated data permanently via Settings → Delete account.</li>
            <li><strong>Right to data portability (Art. 20):</strong> Download your data in a machine-readable JSON format from your profile settings. The export includes your account information, posts, comments, messages, stories, followers, following, blocks, and mutes.</li>
            <li><strong>Right to restrict processing (Art. 18):</strong> Contact us to request restriction of processing while a dispute is resolved.</li>
            <li><strong>Right to object (Art. 21):</strong> Object to processing based on legitimate interests by contacting us.</li>
            <li><strong>Right to withdraw consent:</strong> Where processing is based on consent (e.g. push notifications), you may withdraw it at any time via your device settings.</li>
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

        <Section title="9. International Transfers &amp; Third-Party Services">
          <p>We use the following third-party services that may process data outside the EEA:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google Sign-In (OAuth 2.0):</strong> If you choose to log in with Google, Google's{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                Privacy Policy
              </a>{' '}
              applies to the authentication step. We receive only your name, email, and Google account ID.
            </li>
            <li>
              <strong>Linode / Akamai Object Storage:</strong> User-uploaded media (images, videos) may be stored in Linode
              S3-compatible storage. Linode operates data centres in multiple regions; data may be processed in the
              region selected by the operator.
            </li>
            <li>
              <strong>Expo Push Notifications:</strong> If you use the mobile app, push notification tokens are sent to
              Expo's push service to deliver notifications. Expo's infrastructure is US-based. Only the push
              token and message metadata are transmitted.
            </li>
          </ul>
          <p>
            We rely on standard contractual clauses or adequacy decisions where applicable for any transfers
            outside the EEA. We are working to ensure all transfers meet GDPR Chapter V requirements.
          </p>
        </Section>

        <Section title="10. Content Moderation Transparency">
          <p>
            Under the EU Digital Services Act (Regulation (EU) 2022/2065), we provide users with the ability
            to report illegal content, receive statements of reasons for moderation decisions, and appeal those
            decisions. See our{' '}
            <Link to="/terms" className="text-brand-600 hover:underline font-medium">Terms of Service</Link>{' '}
            for details on our content moderation practices.
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
