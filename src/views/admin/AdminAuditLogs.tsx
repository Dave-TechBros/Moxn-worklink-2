import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DataTable } from './ui/DataTable';
import { AuditLogEntry } from '../../types';
import { Search, ShieldAlert, Globe } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await authFetch(`/api/admin/audit-logs${params}`);
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, search, showToast]);

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 200);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">
          A complete record of every administrative action taken across the platform.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by admin, action, or target..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <DataTable<AuditLogEntry>
        loading={loading}
        rows={logs}
        rowKey={(l) => l.id}
        emptyMessage="No audit log entries found."
        columns={[
          {
            key: 'admin_name',
            header: 'Admin',
            render: (l) => (
              <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] shrink-0">
                  {l.admin_name.charAt(0).toUpperCase()}
                </span>
                {l.admin_name}
              </span>
            )
          },
          {
            key: 'action',
            header: 'Action',
            render: (l) => (
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                {l.action}
              </span>
            )
          },
          {
            key: 'target_title',
            header: 'Target',
            render: (l) => (
              <div className="min-w-[180px]">
                <p className="text-sm font-semibold text-slate-800">{l.target_title || l.target_id}</p>
                <p className="text-[11px] text-slate-400 uppercase">{l.target_type}</p>
              </div>
            )
          },
          {
            key: 'details',
            header: 'Details',
            render: (l) => <span className="text-xs text-slate-500">{l.details || '—'}</span>
          },
          {
            key: 'ip_address',
            header: 'IP',
            render: (l) => l.ip_address ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Globe size={12} /> {l.ip_address}
              </span>
            ) : <span className="text-slate-300">—</span>
          },
          {
            key: 'created_at',
            header: 'Timestamp',
            render: (l) => <span className="text-xs text-slate-500">{new Date(l.created_at).toLocaleString()}</span>
          }
        ]}
      />

      {!loading && logs.length === 0 && search === '' && (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-4">
          <ShieldAlert size={16} /> No admin actions have been recorded yet.
        </div>
      )}
    </div>
  );
};