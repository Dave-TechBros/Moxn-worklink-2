import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatCard } from './ui/StatCard';
import { BarChart, LineChart, DonutChart, EmptyState } from './ui/Charts';
import { AnalyticsData } from '../../types';
import { Users, Briefcase, FileText, Percent, TrendingUp, Trophy, Tag, Activity } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1',
  reviewing: '#f59e0b',
  interview: '#0ea5e9',
  offer: '#10b981',
  rejected: '#f43f5e'
};

export const AdminAnalytics: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/analytics');
      if (!res.ok) throw new Error('Failed to load analytics');
      setData(await res.json());
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load analytics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="No analytics available" message="There is not enough platform data yet." />;
  }

  const growthSeries = data.growth || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Detailed insights into platform growth, hiring funnel, and engagement.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Activity size={14} className="inline mr-1" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Monthly Active Users" value={data.engagement.monthlyActive} icon={Users} accent="indigo" />
        <StatCard label="Avg Applications / Job" value={data.engagement.avgApplicationsPerJob} icon={FileText} accent="emerald" />
        <StatCard label="Offer Conversion Rate" value={`${data.engagement.conversionRate.toFixed(1)}%`} icon={Percent} accent="emerald" />
        <StatCard label="Daily Active Users" value={data.engagement.dailyActive} icon={Activity} accent="amber" />
      </div>

      {/* Growth */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-600" /> Platform Growth (6 months)
        </h3>
        <p className="text-xs text-slate-500 mb-6">Cumulative growth of candidates, employers, jobs, and applications</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold text-emerald-600 mb-2">Candidates & Applications</p>
            <LineChart color="#10b981" series={growthSeries.map((g) => ({ label: g.label, value: g.candidates + g.applications }))} />
          </div>
          <div>
            <p className="text-xs font-bold text-sky-600 mb-2">Employers & Jobs</p>
            <LineChart color="#0ea5e9" series={growthSeries.map((g) => ({ label: g.label, value: g.employers + g.jobs }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-600" /> Hiring Funnel
          </h3>
          <p className="text-xs text-slate-500 mb-4">Applications by stage</p>
          {data.applicationsByStatus.length ? (
            <DonutChart
              data={data.applicationsByStatus.map((d) => ({
                label: d.status,
                value: d.count,
                color: STATUS_COLORS[d.status] || '#94a3b8'
              }))}
            />
          ) : (
            <p className="text-sm text-slate-400">No application data.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tag size={16} className="text-indigo-600" /> Popular Categories
          </h3>
          {data.popularTags.length ? (
            <BarChart data={data.popularTags.map((t) => ({ label: t.tag, value: t.count }))} color="#6366f1" />
          ) : (
            <p className="text-sm text-slate-400">No category data.</p>
          )}
        </div>
      </div>

      {/* Top employers */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" /> Top Employers by Applications
        </h3>
        {data.topEmployers.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-bold">Rank</th>
                  <th className="px-4 py-2.5 font-bold">Company</th>
                  <th className="px-4 py-2.5 font-bold">Jobs</th>
                  <th className="px-4 py-2.5 font-bold text-right">Applications</th>
                </tr>
              </thead>
              <tbody>
                {data.topEmployers.map((e, i) => (
                  <tr key={e.company_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{e.company_name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.jobs}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{e.applications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No employer data yet.</p>
        )}
      </div>
    </div>
  );
};