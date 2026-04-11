import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../hooks/useTheme';

const links = [
  { to: '/feed', icon: '🏠' },
  { to: '/search', icon: '🔍' },
  { to: '/stories', icon: '📸' },
  { to: '/notifications', icon: '🔔' },
];

export default function MobileNav() {
  const { unreadNotifications, user, logout } = useAuthStore();
  const { dark, toggle } = useTheme();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center py-2 z-50">
      {links.map(({ to, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `relative p-2 rounded-xl text-2xl transition-colors ${isActive ? 'text-brand-600' : 'text-gray-500'}`
          }
        >
          {icon}
          {to === '/notifications' && unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </NavLink>
      ))}

      {/* Theme toggle */}
      <button onClick={toggle} className="p-2 rounded-xl text-2xl text-gray-500">
        {dark ? '☀️' : '🌙'}
      </button>

      {/* Profile avatar → profile page */}
      {user && (
        <Link to={`/${user.username}`} className="p-1">
          <img
            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&size=64`}
            alt={user.username}
            className="w-8 h-8 rounded-full object-cover border-2 border-transparent active:border-brand-500"
          />
        </Link>
      )}

      {/* Logout */}
      {user && (
        <button
          onClick={logout}
          className="p-2 rounded-xl text-gray-500 active:text-red-500"
          title="Logout"
          aria-label="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      )}
    </nav>
  );
}
