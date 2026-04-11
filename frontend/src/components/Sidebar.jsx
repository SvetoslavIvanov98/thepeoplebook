import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../hooks/useTheme';
import Logo from './Logo';

const links = [
  { to: '/feed', label: 'Feed', icon: '🏠' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/messages', label: 'Messages', icon: '💬' },
  { to: '/groups', label: 'Groups', icon: '👥' },
  { to: '/stories', label: 'Stories', icon: '📸' },
  { to: '/search', label: 'Search', icon: '🔍' },
];

export default function Sidebar() {
  const { user, unreadNotifications, logout } = useAuthStore();
  const { dark, toggle } = useTheme();

  return (
    <aside className="hidden md:flex flex-col w-64 pr-4 py-4 sticky top-0 h-screen">
      <Logo size="text-xl" className="mb-8 px-2" />
      <nav className="flex-1 flex flex-col gap-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                isActive
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
            {to === '/notifications' && unreadNotifications > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {unreadNotifications}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer mt-4">
          <NavLink to={`/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`}
              alt={user.username}
              className="w-9 h-9 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user.full_name || user.username}</p>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </div>
          </NavLink>
          <button onClick={logout} className="text-sm text-red-400 ml-auto" title="Logout">⏻</button>
        </div>
      )}

      <button
        onClick={toggle}
        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left text-sm font-medium mt-1"
      >
        <span className="text-xl">{dark ? '☀️' : '🌙'}</span>
        <span>{dark ? 'Light mode' : 'Dark mode'}</span>
      </button>
    </aside>
  );
}
