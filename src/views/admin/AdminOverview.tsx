import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatCard } from './ui/StatCard';
import { BarChart, DonutChart, LineChart } from './ui/Charts';
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Activity,
  UserCheck,
  UserX,
  Database
} from 'lucide-react';
import { AdminStats, AnalyticsData } from '../../types';

export const AdminOverview: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/analytics')
      ]);
      if (sRes.ok) setStats(await sRes.json());
      else setStats(null);
      if (aRes.ok) setAnalytics(await aRes.json());
      else setAnalytics(null);
    } catch (e) {
      showToast('Error', 'Failed to load dashboard overview.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading platform overview...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-24 text-slate-500">
        <UserX size={36} className="mx-auto mb-3 text-slate-300" />
        <p className="font-bold">No data available. Confirm you are signed in as an administrator.</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    new: '#6366f1', reviewing: '#f59e0b', interview: '#0ea5e9', offer: '#10b981', rejected: '#f43f5e'
  };
  const appStatusData = (analytics?.applicationsByStatus || []).map((d) => ({
    label: d.status,
    value: d.count,
    color: statusColors[d.status] || '#94a3b8'
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time statistics across users, listings, applications, and moderation.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Activity size={14} className="inline mr-1" /> Refresh
        </button>
      </div>

      {/* Primary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} accent="indigo" sub={`${stats.newRegistrations30d} in 30d`} />
        <StatCard label="Employers" value={stats.totalEmployers} icon={Building2} accent="sky" />
        <StatCard label="Job Seekers" value={stats.totalEmployees} icon={UserCheck} accent="emerald" />
        <StatCard label="Job Posts" value={stats.totalJobs} icon={Briefcase} accent="amber" />
        <StatCard label="Applications" value={stats.totalApplications} icon={FileText} accent="emerald" />
        <StatCard label="Open Reports" value={stats.openReports} icon={ShieldAlert} accent="rose" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Active Users" value={stats.activeUsers} icon={Activity} accent="emerald" sub={`${stats.suspendedUsers} suspended`} />
        <StatCard label="Verified" value={stats.verifiedUsers} icon={CheckCircle2} accent="sky" />
        <StatCard label="Pending Approval" value={stats.pendingApprovals} icon={UserX} accent="amber" />
        <StatCard label="Job Applications Active" value={stats.publishedJobs} icon={Briefcase} accent="indigo" />
        <StatCard label="Companies" value={stats.totalCompanies} icon={Building2} accent="slate" sub={`${stats.activeCompanies} active`} />
        <StatCard label="System Status" value={stats.systemHealthy ? 'Healthy' : 'Degraded'} icon={Database} accent={stats.systemHealthy ? 'emerald' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth line chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Platform Growth</h3>
          <p className="text-xs text-slate-500 mb-4">Cumulative candidate & employer growth (last 6 months)</p>
          {analytics?.growth ? (
            <>
              <p className="text-xs font-bold text-emerald-600 mb-1">Candidates</p>
              <LineChart color="#10b981" series={(analytics.growth || []).map((g) => ({ label: g.label, value: g.candidates }))} />
              <div className="h-5" />
              <p className="text-xs font-bold text-sky-600 mb-1">Employers</p>
              <LineChart color="#0ea5e9" series={(analytics.growth || []).map((g) => ({ label: g.label, value: g.employers }))} />
            </>
          ) : (
            <p className="text-sm text-slate-400">No growth data available.</p>
          )}
        </div>

        {/* Application status donut */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Applications by Status</h2>
          <p className="text-xs text-slate-500 mb-4">Hiring funnel distribution</p>
          {appStatusData.length ? <DonutChart data={appStatusData} /> : <p className="text-sm text-slate-400">No applications.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular tags bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Popular Job Categories</h2>
          {analytics?.popularTags?.length ? (
            <BarChart data={analytics.popularTags.map((t) => ({ label: t.tag, value: t.count }))} color="#6366f1" />
          ) : (
            <p className="text-sm text-slate-400">No category data.</p>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" /> Recent Admin Activity
          </h2>
          {analytics?.recentActivity?.length ? (
            <div className="space-y-3">
              {analytics.recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">
                      <span className="text-indigo-600">{log.admin_name}</span> · {log.action}
                    </p>
                    <p className="text-slate-400 truncate">
                      {log.target_type} — {log.target_title || log.target_id}
                    </p>
                  </div>
                  <span className="text-slate-400 ml-auto shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No recent admin activity recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
};