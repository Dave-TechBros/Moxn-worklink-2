import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DataTable } from './ui/DataTable';
import { Modal } from '../../components/Modal';
import { FlagReport } from '../../types';
import { Search, AlertTriangle, CheckCircle2, Eye, Flag } from 'lucide-react';

type ReportStatusFilter = 'all' | 'open' | 'resolved';

export const AdminReports: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<ReportStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState<FlagReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<FlagReport | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
      const res = await authFetch(`/api/admin/reports?${params}`);
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, status, page, limit, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const resolveReport = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/reports/${id}/resolve`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to resolve report');
      showToast('Resolved', 'Report marked as resolved.', 'success');
      fetchReports();
      setDetail(null);
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const openReports = total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Moderation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review user-reported listings and moderate content across the platform.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled
            placeholder="Search filtering coming soon..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as ReportStatusFilter); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer"
        >
          <option value="all">All Reports</option>
          <option value="open">Open ({openReports})</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <DataTable<FlagReport>
        loading={loading}
        rows={rows}
        total={total}
        page={page}
        pageSize={limit}
        onPage={setPage}
        rowKey={(r) => r.id}
        emptyMessage="No reports found."
        columns={[
          {
            key: 'target_title',
            header: 'Reported Item',
            render: (r) => (
              <div className="flex items-center gap-2.5">
                {r.target_type === 'job' ? (
                  <JobIcon />
                ) : (
                  <BuildingIcon />
                )}
                <div>
                  <p className="font-bold text-slate-900 text-sm">{r.target_title}</p>
                  <p className="text-xs text-slate-400 uppercase">{r.target_type}</p>
                </div>
              </div>
            )
          },
          {
            key: 'reason',
            header: 'Reason',
            render: (r) => <span className="text-sm text-slate-700">{r.reason}</span>
          },
          {
            key: 'reported_by_name',
            header: 'Reported By',
            render: (r) => <span className="text-sm text-slate-600">{r.reported_by_name}</span>
          },
          {
            key: 'created_at',
            header: 'Date',
            sortable: true,
            render: (r) => <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${
                r.status === 'open' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {r.status}
              </span>
            )
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDetail(r)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="View report"
                >
                  <Eye size={15} />
                </button>
                {r.status === 'open' && (
                  <button
                    onClick={() => resolveReport(r.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Resolve
                  </button>
                )}
              </div>
            )
          }
        ]}
      />

      {detail && (
        <Modal
          isOpen={!!detail}
          onClose={() => setDetail(null)}
          title={`Report: ${detail.target_title}`}
          subtitle={`${detail.target_type.toUpperCase()} · Reported by ${detail.reported_by_name}`}
          maxWidth="md"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
                detail.status === 'open' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {detail.status === 'open' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                {detail.status}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600">
                {new Date(detail.created_at).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason</p>
              <p className="text-sm font-semibold text-slate-800">{detail.reason}</p>
            </div>

            {detail.details && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Details</p>
                <p className="text-sm text-slate-700 leading-relaxed">{detail.details}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">Report ID: {detail.id}</p>
              {detail.status === 'open' && (
                <button
                  onClick={() => resolveReport(detail.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Resolve Report
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const IconWrapper: React.FC<{ children: React.ReactNode; cls: string }> = ({ children, cls }) => (
  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>{children}</div>
);

const JobIcon = () => (
  <IconWrapper cls="bg-indigo-50 text-indigo-600">
    <Flag size={16} />
  </IconWrapper>
);

const BuildingIcon = () => (
  <IconWrapper cls="bg-amber-50 text-amber-600">
    <Flag size={16} />
  </IconWrapper>
);