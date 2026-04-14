import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Users, FileText, MessageSquare, Users2, BookOpen, TrendingUp } from 'lucide-react';

function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value?.toLocaleString() ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub != null && <p className="text-xs text-green-500 mt-1">+{sub?.toLocaleString()} today</p>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data?.total_users} icon={Users} sub={data?.new_users_today} />
        <StatCard label="Total Posts" value={data?.total_posts} icon={FileText} sub={data?.new_posts_today} />
        <StatCard label="Total Comments" value={data?.total_comments} icon={MessageSquare} />
        <StatCard label="Total Groups" value={data?.total_groups} icon={Users2} />
        <StatCard label="Total Stories" value={data?.total_stories} icon={BookOpen} />
      </div>
    </div>
  );
}
