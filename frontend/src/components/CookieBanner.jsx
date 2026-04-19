import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_notice_acknowledged')) {
      setVisible(true);
    }
  }, []);

  const acknowledge = () => {
    localStorage.setItem('cookie_notice_acknowledged', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">
          🍪 We use one strictly necessary cookie (<code className="text-xs">refresh_token</code>) to keep you
          logged in, and store a few items in your browser's local storage for authentication, theme preference,
          and remembering that you've seen this notice. No advertising or tracking cookies are used.{' '}
          <Link to="/privacy" className="text-brand-600 hover:underline font-medium">
            Learn more in our Privacy Policy
          </Link>
          .
        </p>
        <button
          onClick={acknowledge}
          className="shrink-0 px-5 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
