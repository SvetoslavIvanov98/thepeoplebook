import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../hooks/useTheme';

const links = [
  { to: '/feed', icon: '🏠' },
  { to: '/search', icon: '🔍' },
  { to: '/stories', icon: '📸' },
  { to: '/notifications', icon: '🔔' },
  { to: '/messages', icon: '💬' },
];

export default function MobileNav() {
  const { unreadNotifications } = useAuthStore();
  const { dark, toggle } = useTheme();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around py-2 z-50">
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
      <button onClick={toggle} className="p-2 rounded-xl text-2xl text-gray-500">
        {dark ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
