import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'framer-motion';
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
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 p-6 glass rounded-[2rem] shadow-xl sticky top-4 h-[calc(100vh-2rem)] border-none">
      <Logo size="text-2xl" className="mb-10 tracking-tighter text-center" />
      <nav className="flex-1 flex flex-col gap-2 relative">
        {links.map(({ to, label, icon }) => {
          const isActive =
            location.pathname === to || (to === '/feed' && location.pathname === '/');

          return (
            <NavLink
              key={to}
              to={to}
              className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl font-medium transition-colors z-10 ${
                isActive
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-md rounded-2xl -z-10 shadow-sm border border-white/20 dark:border-white/5"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="text-xl transition-transform duration-200 hover:scale-110">
                {icon}
              </span>
              <span className="text-base">{label}</span>
              {to === '/notifications' && unreadNotifications > 0 && (
                <span className="ml-auto bg-brand-500 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-sm">
                  {unreadNotifications}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group">
            <NavLink to={`/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`}
                alt={user.username}
                className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:shadow-md transition-shadow"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{user.username}
                </p>
              </div>
            </NavLink>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30"
              title="Logout"
            >
              ⏻
            </button>
          </div>
        )}

        <button
          onClick={toggle}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/50 w-full text-left text-sm font-medium transition-colors text-gray-700 dark:text-gray-300"
        >
          <span className="text-xl">{dark ? '☀️' : '🌙'}</span>
          <span className="text-base">{dark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  );
}
