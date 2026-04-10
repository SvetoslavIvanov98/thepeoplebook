import { Link } from 'react-router-dom';

const GITHUB_URL = 'https://github.com/SvetoslavIvanov98/thepeoplebook'; // ← update this

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const features = [
  {
    icon: '🔒',
    title: 'Your data stays yours',
    body: 'We never sell, share, or monetise your personal data. What you post belongs to you — always.',
  },
  {
    icon: '👁️',
    title: 'No tracking, no ads',
    body: 'There are no advertisers, no tracking pixels, and no third-party data brokers. Your activity is never profiled.',
  },
  {
    icon: '🗑️',
    title: 'Real right to be forgotten',
    body: 'Delete your account and everything goes — posts, messages, followers, all data — permanently and immediately.',
  },
  {
    icon: '🔑',
    title: 'Passwords hashed, tokens secured',
    body: 'Passwords are hashed with bcrypt. Session tokens live in HttpOnly cookies — invisible to JavaScript and safe from XSS.',
  },
  {
    icon: '📵',
    title: 'No unsolicited contact',
    body: 'Only people you follow can appear in your suggested feed. Direct messages require mutual interaction.',
  },
  {
    icon: '🛡️',
    title: 'Open & auditable',
    body: 'The source code is open. Anyone can inspect exactly how your data is handled — no black boxes.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-10">
        <span className="text-xl font-extrabold text-brand-600">The People Book</span>
        <div className="flex gap-3 items-center">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <GitHubIcon />
            <span className="hidden sm:inline">View on GitHub</span>
          </a>
          <Link to="/login" className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-full bg-brand-600 text-white hover:bg-brand-700 transition-colors">
            Join free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 py-24">
        <h1 className="text-5xl font-extrabold leading-tight mb-6">
          A social network that<br />
          <span className="text-brand-600">actually respects you</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
          The People Book is a private-first social network. Connect with people you care about —
          without surveillance, without ads, without your data being a product.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/register" className="px-8 py-3 rounded-full bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 transition-colors">
            Create your account
          </Link>
          <Link to="/login" className="px-8 py-3 rounded-full border border-gray-300 dark:border-gray-700 font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Privacy pledge */}
      <section className="bg-brand-600 text-white py-12 px-6 text-center">
        <p className="text-2xl font-bold max-w-2xl mx-auto">
          "We will never sell your data, show you ads, or build a profile of you for third parties. Ever."
        </p>
        <p className="mt-3 text-brand-100 text-sm">— The People Book team</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold text-center mb-12">Privacy by design, not by policy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(({ icon, title, body }) => (
            <div key={title} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 space-y-3">
              <span className="text-4xl">{icon}</span>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we don't do */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold mb-8 text-center">What we will never do</h2>
          <ul className="space-y-4">
            {[
              'Sell your data to advertisers or data brokers',
              'Show you targeted or behavioural advertising',
              'Track you across the web with pixels or fingerprinting',
              'Share your information with governments without a lawful court order',
              'Use dark patterns to trick you into sharing more than you intend',
              'Make it difficult or impossible to delete your account and data',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-red-500 font-bold text-lg leading-none">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-xl mx-auto text-center px-6 py-20">
        <h2 className="text-3xl font-extrabold mb-4">Ready to join?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">It's free. No credit card. No catch.</p>
        <Link to="/register" className="px-10 py-4 rounded-full bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 transition-colors">
          Get started
        </Link>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 text-center py-6 text-xs text-gray-400 flex flex-col items-center gap-2">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <GitHubIcon />
          View source on GitHub
        </a>
        <div className="flex gap-4 justify-center">
          <Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/register" className="hover:text-brand-600 transition-colors">Join free</Link>
        </div>
        <span>© {new Date().getFullYear()} The People Book · Privacy-first social networking</span>
      </footer>
    </div>
  );
}
