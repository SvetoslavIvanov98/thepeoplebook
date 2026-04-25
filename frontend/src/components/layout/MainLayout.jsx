import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import RightPanel from '../RightPanel';
import MobileNav from '../MobileNav';
import FloatingMessageBubble from '../FloatingMessageBubble';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen w-full max-w-7xl mx-auto md:px-4 md:py-4 gap-6">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 min-h-screen md:min-h-[calc(100vh-2rem)] pb-20 md:pb-0 overflow-hidden relative">
        <Outlet />
      </main>
      <RightPanel />
      <MobileNav />
      <FloatingMessageBubble />
    </div>
  );
}
