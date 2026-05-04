import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useEffect } from 'react';
import { initSocket } from './services/socket.service';
import CookieBanner from './components/CookieBanner';
import GlobalLightbox from './components/GlobalLightbox';

import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import AdminLayout from './components/layout/AdminLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LandingPage from './pages/LandingPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import PostPage from './pages/PostPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import StoriesPage from './pages/StoriesPage';
import GroupPage from './pages/GroupPage';
import GroupsPage from './pages/GroupsPage';
import SearchPage from './pages/SearchPage';
import HashtagPage from './pages/HashtagPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPostsPage from './pages/admin/AdminPostsPage';
import AdminGroupsPage from './pages/admin/AdminGroupsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import SettingsPage from './pages/SettingsPage';

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

const GuestRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return !token ? children : <Navigate to="/" replace />;
};

const AdminRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  // Wait for fetchMe to complete before checking role
  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/feed" replace />;
  return children;
};

export default function App() {
  const { token, fetchMe, initializeAuth, isInitializing } = useAuthStore();

  // M-1: On first load, silently refresh the token using the HttpOnly cookie.
  // This replaces the previous localStorage-based token persistence.
  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe();
      initSocket(token);
    }
  }, [token]);

  // Block rendering until we know whether the user is authenticated.
  // This prevents PrivateRoute from redirecting to /login on initial load.
  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <CookieBanner />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={token ? <Navigate to="/feed" replace /> : <LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Guest routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Route>

        {/* Private routes */}
        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupPage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/hashtag/:tag" element={<HashtagPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/:username" element={<ProfilePage />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/posts" element={<AdminPostsPage />} />
          <Route path="/admin/groups" element={<AdminGroupsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
        </Route>
      </Routes>
      <GlobalLightbox />
    </>
  );
}
