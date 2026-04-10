import { Link } from 'react-router-dom';

const GITHUB_URL = 'https://github.com/SvetoslavIvanov98/thepeoplebook';

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const memories = [
  { label: 'Before the algorithm decided what you felt like seeing' },
  { label: 'Before your feed was a product someone else sold' },
  { label: 'Before every post was optimised for engagement bait' },
  { label: 'Before signing up meant forfeiting your data forever' },
  { label: 'When you just… talked to people you actually knew' },
];

const features = [
  {
    prefix: '01',
    title: 'Your data stays yours',
    body: 'We never sell, share, or monetise your personal data. What you post belongs to you — always.',
  },
  {
    prefix: '02',
    title: 'No tracking, no ads',
    body: 'No advertisers, no tracking pixels, no data brokers. Your activity is never profiled or packaged and sold.',
  },
  {
    prefix: '03',
    title: 'Real right to be forgotten',
    body: 'Delete your account and everything goes — posts, messages, followers, all of it — permanently and immediately.',
  },
  {
    prefix: '04',
    title: 'Passwords hashed, tokens secured',
    body: 'Passwords are hashed with bcrypt. Session tokens live in HttpOnly cookies — invisible to JavaScript, safe from XSS.',
  },
  {
    prefix: '05',
    title: 'No unsolicited contact',
    body: 'Only people you follow can appear in your feed. Direct messages require mutual interaction.',
  },
  {
    prefix: '06',
    title: 'Open & auditable',
    body: 'The source code is public. Anyone can inspect exactly how your data is handled — no black boxes, no trust required.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-10">
        <span className="font-mono text-lg font-bold tracking-tight text-brand-600">
          the<span className="text-gray-900 dark:text-gray-100">people</span>book
        </span>
        <div className="flex gap-3 items-center">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <GitHubIcon />
            <span className="hidden sm:inline">Source</span>
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
      <section className="max-w-3xl mx-auto text-center px-6 pt-24 pb-16">
        <p className="font-mono text-xs tracking-widest uppercase text-brand-600 mb-6">
          est. when the web still felt human
        </p>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6">
          Do you miss<br />
          <span className="text-brand-600">the old internet?</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
          Before the feeds. Before the ads. Before your attention was the product.
          The People Book is a social network that works for <em>you</em> — not for advertisers.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/register" className="px-8 py-3 rounded-full bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 transition-colors">
            Come back online
          </Link>
          <Link to="/login" className="px-8 py-3 rounded-full border border-gray-300 dark:border-gray-700 font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Nostalgia list */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8">
          <p className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-5">
            // remember when...
          </p>
          <ul className="space-y-3">
            {memories.map(({ label }) => (
              <li key={label} className="flex items-start gap-3 text-gray-600 dark:text-gray-400 text-sm">
                <span className="font-mono text-brand-600 select-none">›</span>
                {label}
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs text-gray-400 mt-6">
            // that internet still exists. you just need the right place.
          </p>
        </div>
      </section>

      {/* Privacy pledge */}
      <section className="bg-brand-600 text-white py-14 px-6 text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-brand-200 mb-4">our only promise</p>
        <p className="text-2xl font-bold max-w-2xl mx-auto leading-snug">
          "We will never sell your data, show you ads, or build a profile of you for third parties. Ever."
        </p>
        <p className="mt-4 text-brand-100 text-sm font-mono">— The People Book team</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold text-center mb-3">Privacy by design, not by policy</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-12 font-mono">
          // no fine print. no asterisks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ prefix, title, body }) => (
            <div key={title} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 space-y-3 border border-gray-100 dark:border-gray-800">
              <span className="font-mono text-xs text-brand-600 tracking-widest">{prefix}</span>
              <h3 className="font-bold text-base">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we don't do */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs text-gray-400 uppercase tracking-widest text-center mb-2">
            // hard no's
          </p>
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
                <span className="font-mono text-red-500 font-bold leading-none select-none">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-xl mx-auto text-center px-6 py-24">
        <p className="font-mono text-xs tracking-widest uppercase text-brand-600 mb-4">no tricks. no catch.</p>
        <h2 className="text-4xl font-extrabold mb-4">The web you remember<br />is still out there.</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10">
          Free to join. No credit card. No ads. No data harvesting.
          Just people talking to people.
        </p>
        <Link to="/register" className="px-10 py-4 rounded-full bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 transition-colors">
          Find your people
        </Link>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 text-center py-8 text-xs text-gray-400 flex flex-col items-center gap-3">
        <span className="font-mono text-brand-600 font-bold text-sm">thepeoplebook</span>
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
        <span className="font-mono">© {new Date().getFullYear()} The People Book · Privacy-first social networking</span>
      </footer>
    </div>
  );
}
