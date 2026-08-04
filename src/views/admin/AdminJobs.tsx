import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DataTable } from './ui/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Job } from '../../types';
import {
  Search,
  CheckCircle2,
  XCircle,
  Archive,
  Trash2,
  Eye,
  MapPin,
  DollarSign,
  Briefcase,
  Clock
} from 'lucide-react';

type JobStatusFilter = 'all' | 'published' | 'draft' | 'closed';

interface Props {
  initialStatus?: JobStatusFilter;
}

export const AdminJobs: React.FC<Props> = ({ initialStatus = 'all' }) => {
  const { authFetch, currentUser } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<JobStatusFilter>(initialStatus);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    job: Job;
    type: 'publish' | 'reject' | 'archive' | 'delete';
  }>(null);

  const canDelete = currentUser?.admin_level === 'super_admin';

  const fetchJobs = useCallback(async () => {
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
      const res = await authFetch(`/api/admin/jobs?${params}`);
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load jobs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, status, search, sortKey, sortDir, page, limit, showToast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { job, type } = confirmAction;
    try {
      let res;
      if (type === 'delete') {
        res = await authFetch(`/api/admin/jobs/${job.id}`, { method: 'DELETE' });
      } else {
        const target =
          type === 'publish' ? 'published' : 'closed';
        res = await authFetch(`/api/admin/jobs/${job.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: target })
        });
      }
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || 'Action failed');
      }
      showToast('Success', type === 'delete' ? 'Job deleted.' : 'Job updated.', 'success');
      setConfirmAction(null);
      fetchJobs();
      setDetailJob(null);
    } catch (e: any) {
      showToast('Error', e.message, 'error');
      setConfirmAction(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700' },
      draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700' },
      closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-600' }
    };
    const m = map[s] || map.draft;
    return <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${m.cls}`}>{m.label}</span>;
  };

  const actionButtons = (j: Job) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setDetailJob(j)}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
        title="View job"
      >
        <Eye size={15} />
      </button>
      {j.status !== 'published' && (
        <button
          onClick={() => setConfirmAction({ job: j, type: 'publish' })}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
          title="Approve & publish"
        >
          <CheckCircle2 size={15} />
        </button>
      )}
      {j.status !== 'closed' && (
        <button
          onClick={() => setConfirmAction({ job: j, type: 'archive' })}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          title="Archive / close"
        >
          <Archive size={15} />
        </button>
      )}
      <button
        onClick={() => setConfirmAction({ job: j, type: 'reject' })}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
        title="Reject"
      >
        <XCircle size={15} />
      </button>
      {canDelete && (
        <button
          onClick={() => setConfirmAction({ job: j, type: 'delete' })}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          title="Delete permanently"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Job Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Approve, reject, archive, or delete job listings across the platform.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by job title, company, or tag..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as JobStatusFilter); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft / Pending Approval</option>
          <option value="closed">Closed / Archived</option>
        </select>
      </div>

      <DataTable<Job>
        loading={loading}
        rows={rows}
        total={total}
        page={page}
        pageSize={limit}
        onPage={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(j) => j.id}
        emptyMessage="No jobs match the current filters."
        columns={[
          {
            key: 'title',
            header: 'Job',
            sortable: true,
            render: (j) => (
              <div className="flex items-center gap-3">
                {j.company_logo ? (
                  <img src={j.company_logo} alt={j.company_name} className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {j.company_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 text-sm">{j.title}</p>
                  <p className="text-xs text-slate-400">{j.company_name}</p>
                </div>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (j) => statusBadge(j.status)
          },
          {
            key: 'employment_type',
            header: 'Type',
            render: (j) => (
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <Briefcase size={13} className="text-slate-400" /> {j.employment_type}
              </span>
            )
          },
          {
            key: 'location',
            header: 'Location',
            render: (j) => (
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <MapPin size={13} className="text-slate-400" /> {j.location}
              </span>
            )
          },
          {
            key: 'salary_min',
            header: 'Salary',
            sortable: true,
            render: (j) => (
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <DollarSign size={13} className="text-slate-400" />
                {j.salary_min?.toLocaleString()} - {j.salary_max?.toLocaleString()} {j.salary_currency}
              </span>
            )
          },
          {
            key: 'applicants',
            header: 'Applicants',
            sortable: true,
            render: (j) => <span className="text-xs text-slate-500">{j.applicant_count || 0}</span>
          },
          {
            key: 'created_at',
            header: 'Posted',
            sortable: true,
            render: (j) => <span className="text-xs text-slate-500">{new Date(j.created_at).toLocaleDateString()}</span>
          },
          {
            key: 'actions',
            header: 'Actions',
            render: actionButtons
          }
        ]}
      />

      {detailJob && (
        <Modal
          isOpen={!!detailJob}
          onClose={() => setDetailJob(null)}
          title={detailJob.title}
          subtitle={`${detailJob.company_name} · ${detailJob.location}`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              {statusBadge(detailJob.status)}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600">
                <Clock size={12} /> Posted {new Date(detailJob.created_at).toLocaleDateString()}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700">
                {detailJob.employment_type} · {detailJob.location_type}
              </span>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{detailJob.description}</p>

            {detailJob.requirements?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Requirements</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  {detailJob.requirements.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}

            {detailJob.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detailJob.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs">{t}</span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {detailJob.applicant_count || 0} applicants · Salary{' '}
                {detailJob.salary_min?.toLocaleString()} - {detailJob.salary_max?.toLocaleString()} {detailJob.salary_currency}
              </p>
              <div className="flex gap-2">
                {detailJob.status !== 'published' && (
                  <button
                    onClick={() => setConfirmAction({ job: detailJob, type: 'publish' })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Approve & Publish
                  </button>
                )}
                {detailJob.status !== 'closed' && (
                  <button
                    onClick={() => setConfirmAction({ job: detailJob, type: 'archive' })}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Archive
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmAction({ job: detailJob, type: 'delete' })}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeConfirmAction}
          title={confirmAction.type === 'delete' ? `Delete "${confirmAction.job.title}"?` :
                 confirmAction.type === 'publish' ? `Approve "${confirmAction.job.title}"?` :
                 confirmAction.type === 'archive' ? `Archive "${confirmAction.job.title}"?` :
                 `Reject "${confirmAction.job.title}"?`}
          message={confirmAction.type === 'delete'
            ? 'This permanently removes the job listing. This cannot be undone.'
            : confirmAction.type === 'publish'
            ? 'The job will be published and visible to all job seekers.'
            : confirmAction.type === 'archive'
            ? 'The job will be closed and hidden from job seekers, but retained for records.'
            : 'The job will be rejected and closed. The employer will be notified.'}
          confirmLabel={confirmAction.type === 'delete' ? 'Delete' :
            confirmAction.type === 'publish' ? 'Approve' :
            confirmAction.type === 'archive' ? 'Archive' : 'Reject'}
          isDestructive={confirmAction.type === 'delete'}
        />
      )}
    </div>
  );
};