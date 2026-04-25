import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../hooks/useTheme';

import { Home, Users, Search, Camera, Bell, Sun, Moon, LogOut } from 'lucide-react';

const links = [
  { to: '/feed', icon: <Home className="w-6 h-6" /> },
  { to: '/groups', icon: <Users className="w-6 h-6" /> },
  { to: '/search', icon: <Search className="w-6 h-6" /> },
  { to: '/stories', icon: <Camera className="w-6 h-6" /> },
  { to: '/notifications', icon: <Bell className="w-6 h-6" /> },
];

export default function MobileNav() {
  const { unreadNotifications, user, logout } = useAuthStore();
  const { dark, toggle } = useTheme();

  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 glass border border-gray-200/50 dark:border-gray-800/50 flex justify-around items-center py-2 px-2 z-50 rounded-full shadow-xl">
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
      <button
        onClick={toggle}
        className="p-2 rounded-xl text-gray-500 hover:text-brand-600 transition-colors"
      >
        {dark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
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
          <LogOut className="w-6 h-6" />
        </button>
      )}
    </nav>
  );
}
