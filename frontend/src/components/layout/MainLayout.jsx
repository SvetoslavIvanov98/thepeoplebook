import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import RightPanel from '../RightPanel';
import MobileNav from '../MobileNav';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen max-w-6xl mx-auto px-2">
      <Sidebar />
      <main className="flex-1 border-x border-gray-200 dark:border-gray-800 min-h-screen">
        <Outlet />
      </main>
      <RightPanel />
      <MobileNav />
    </div>
  );
}
