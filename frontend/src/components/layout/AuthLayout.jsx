import { Outlet, Link } from 'react-router-dom';
import Logo from '../Logo';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-purple-700 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <Link to="/" className="flex justify-center mb-6 hover:opacity-80 transition-opacity">
          <Logo size="text-2xl" />
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
