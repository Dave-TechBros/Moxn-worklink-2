import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DataTable } from './ui/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Application } from '../../types';
import {
  Search,
  FileText,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays
} from 'lucide-react';

type AppStatusFilter = 'all' | 'new' | 'reviewing' | 'interview' | 'offer' | 'rejected';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-sky-50 text-sky-700' },
  reviewing: { label: 'Reviewing', cls: 'bg-amber-50 text-amber-700' },
  interview: { label: 'Interview', cls: 'bg-violet-50 text-violet-700' },
  offer: { label: 'Offer', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700' }
};

export const AdminApplications: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<AppStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    app: Application;
    to: AppStatusFilter;
  }>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        search,
        sort: sortKey,
        dir: sortDir,
        page: String(page),
        limit: String(limit)
      });
      const res = await authFetch(`/api/admin/applications?${params}`);
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, status, search, sortKey, sortDir, page, limit, showToast]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    const { app, to } = confirmAction;
    try {
      const res = await authFetch(`/api/admin/applications/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Status change failed');
      }
      showToast('Updated', `Application moved to "${to}".`, 'success');
      setConfirmAction(null);
      setDetailApp((prev) => prev ? { ...prev, status: to } : prev);
      fetchApps();
    } catch (e: any) {
      showToast('Error', e.message, 'error');
      setConfirmAction(null);
    }
  };

  const badge = (s: string) => {
    const m = STATUS_META[s] || STATUS_META.new;
    return <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Applications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and update the status of every job application on the platform.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by candidate, job title, or company..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as AppStatusFilter); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <DataTable<Application>
        loading={loading}
        rows={rows}
        total={total}
        page={page}
        pageSize={limit}
        onPage={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(a) => a.id}
        emptyMessage="No applications match the current filters."
        columns={[
          {
            key: 'candidate_name',
            header: 'Candidate',
            sortable: true,
            render: (a) => (
              <div>
                <p className="font-bold text-slate-900 text-sm">{a.candidate_name}</p>
                <p className="text-xs text-slate-400">{a.candidate_headline || a.candidate_email}</p>
              </div>
            )
          },
          {
            key: 'job_title',
            header: 'Job',
            sortable: true,
            render: (a) => (
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.job_title}</p>
                <p className="text-xs text-slate-400">{a.company_name}</p>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (a) => badge(a.status)
          },
          {
            key: 'created_at',
            header: 'Applied',
            sortable: true,
            render: (a) => (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays size={13} className="text-slate-400" /> {new Date(a.created_at).toLocaleDateString()}
              </span>
            )
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (a) => (
              <button
                onClick={() => setDetailApp(a)}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                Review
              </button>
            )
          }
        ]}
      />

      {detailApp && (
        <Modal
          isOpen={!!detailApp}
          onClose={() => setDetailApp(null)}
          title={detailApp.candidate_name}
          subtitle={`Applied for ${detailApp.job_title} at ${detailApp.company_name}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              {badge(detailApp.status)}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600">
                <Clock size={12} /> Applied {new Date(detailApp.created_at).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Candidate</p>
              <p className="text-sm font-bold text-slate-900">{detailApp.candidate_name}</p>
              <p className="text-xs text-slate-600 inline-flex items-center gap-1.5">
                <Mail size={13} /> {detailApp.candidate_email}
              </p>
              {detailApp.candidate_headline && (
                <p className="text-sm text-slate-700">{detailApp.candidate_headline}</p>
              )}
            </div>

            {detailApp.cover_note && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cover Note</p>
                <p className="text-sm text-slate-700 leading-relaxed">{detailApp.cover_note}</p>
              </div>
            )}

            {detailApp.status_history?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">History</p>
                <div className="space-y-2">
                  {detailApp.status_history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-xs">
                      <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <p className="text-slate-700">
                          <span className="font-bold uppercase">{h.from_status}</span> →{' '}
                          <span className="font-bold uppercase text-indigo-600">{h.to_status}</span>
                        </p>
                        <p className="text-slate-400">{h.note}</p>
                        <p className="text-slate-400">
                          by {h.updated_by_name} · {new Date(h.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {(['new', 'reviewing', 'interview', 'offer', 'rejected'] as AppStatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setConfirmAction({ app: detailApp, to: s })}
                    disabled={detailApp.status === s}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      s === 'rejected'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : s === 'offer'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'new' ? <span className="inline-flex items-center gap-1"><Clock size={12} /> New</span> :
                     s === 'reviewing' ? 'Reviewing' : s === 'interview' ? 'Interview' :
                     s === 'offer' ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Offer</span> :
                     <span className="inline-flex items-center gap-1"><XCircle size={12} /> Rejected</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeStatusChange}
          title={`Move ${confirmAction.app.candidate_name} to "${confirmAction.to}"?`}
          message={
            confirmAction.to === 'rejected'
              ? 'This will mark the application as rejected. Consider adding a note to the history.'
              : `The application status will change to "${confirmAction.to}".`
          }
          confirmLabel={confirmAction.to === 'rejected' ? 'Reject' : `Set to ${confirmAction.to}`}
          isDestructive={confirmAction.to === 'rejected'}
        />
      )}
    </div>
  );
};