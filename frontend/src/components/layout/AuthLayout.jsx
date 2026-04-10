import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-purple-700 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-brand-600 mb-6">The People Book</h1>
        <Outlet />
      </div>
    </div>
  );
}
