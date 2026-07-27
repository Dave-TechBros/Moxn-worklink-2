import React, { useState, useEffect } from 'react';
import { Company, FlagReport, Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  ShieldAlert,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Power,
  Trash2,
  BarChart3,
  Sparkles
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<FlagReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Suspend Company Dialog
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, repRes, statRes] = await Promise.all([
        authFetch('/api/admin/companies'),
        authFetch('/api/reports'),
        authFetch('/api/admin/stats')
      ]);

      if (compRes.ok) setCompanies(await compRes.json());
      if (repRes.ok) setReports(await repRes.json());
      if (statRes.ok) setStats(await statRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCompanyStatus = async (company: Company) => {
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await authFetch(`/api/admin/companies/${company.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update company status');

      showToast(
        'Company Status Updated',
        `Company '${company.name}' is now '${newStatus}'. Associated listings updated.`,
        'success'
      );
      fetchData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const resolveReport = async (reportId: string) => {
    try {
      const res = await authFetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'PATCH'
      });

      if (!res.ok) throw new Error('Failed to resolve flag');

      showToast('Report Resolved', 'Spam report marked resolved.', 'success');
      fetchData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={18} className="text-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Platform Moderation & Security Panel
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Marketplace Center
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Monitor ecosystem safety, triage spam flags, and manage company verification status.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Employers
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalCompanies}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              {stats.activeCompanies} Active
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Published Jobs
            </p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.publishedJobs}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Candidate Applications
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">
              {stats.totalApplications}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Open Flag Reports
            </p>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">{stats.openReports}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Spam / Flag Triage Queue */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>Flagged Listings & Spam Queue ({reports.filter((r) => r.status === 'open').length})</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Community user reports requiring admin moderation.
            </p>

            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 rounded-xl border transition-all ${
                    report.status === 'open'
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {report.reason}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {report.target_title}
                      </h4>
                    </div>

                    {report.status === 'open' ? (
                      <button
                        onClick={() => resolveReport(report.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Resolved
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 mt-2 leading-relaxed">{report.details}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-200/60">
                    <span>Reported by: {report.reported_by_name}</span>
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company Registry & Moderation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              <span>Registered Employers ({companies.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Suspend unverified entities to automatically unpublish their listings.
            </p>

            <div className="space-y-3">
              {companies.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={comp.logo}
                      alt={comp.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{comp.name}</h4>
                      <p className="text-xs text-slate-500">{comp.industry}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={comp.status} size="sm" />

                    <button
                      onClick={() => {
                        setSelectedCompany(comp);
                        setSuspendModalOpen(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        comp.status === 'active'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {comp.status === 'active' ? 'Suspend' : 'Reinstate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM SUSPEND MODAL */}
      {selectedCompany && (
        <ConfirmDialog
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          onConfirm={() => toggleCompanyStatus(selectedCompany)}
          title={`${selectedCompany.status === 'active' ? 'Suspend' : 'Reinstate'} Company`}
          message={`Are you sure you want to ${
            selectedCompany.status === 'active' ? 'suspend' : 'reinstate'
          } '${selectedCompany.name}'? ${
            selectedCompany.status === 'active'
              ? 'This will immediately hide all jobs published by this company from candidate search.'
              : 'This will restore company visibility.'
          }`}
          confirmLabel={selectedCompany.status === 'active' ? 'Suspend Company' : 'Reinstate'}
          isDestructive={selectedCompany.status === 'active'}
        />
      )}
    </div>
  );
};
