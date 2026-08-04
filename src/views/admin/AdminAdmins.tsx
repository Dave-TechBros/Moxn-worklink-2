import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DataTable } from './ui/DataTable';
import { Modal } from '../../components/Modal';
import { User, AdminLevel } from '../../types';
import { UserCog, ShieldCheck, Shield, ShieldAlert, Search } from 'lucide-react';

const LEVEL_META: Record<AdminLevel, { label: string; icon: React.ReactNode; cls: string }> = {
  super_admin: { label: 'Super Admin', icon: <ShieldCheck size={14} />, cls: 'bg-rose-50 text-rose-700' },
  admin: { label: 'Admin', icon: <Shield size={14} />, cls: 'bg-indigo-50 text-indigo-700' },
  moderator: { label: 'Moderator', icon: <ShieldAlert size={14} />, cls: 'bg-slate-100 text-slate-600' }
};

export const AdminAdmins: React.FC = () => {
  const { authFetch, currentUser } = useAuth();
  const { showToast } = useToast();

  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [newLevel, setNewLevel] = useState<AdminLevel>('moderator');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended'>('active');

  const isSuperAdmin = currentUser?.admin_level === 'super_admin';

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: 'admin', search, page: String(page), limit: String(limit) });
      const res = await authFetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to load admins');
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load admins.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, search, page, limit, showToast]);

  useEffect(() => {
    const t = setTimeout(() => fetchAdmins(), 200);
    return () => clearTimeout(t);
  }, [fetchAdmins]);

  const openEdit = (u: User) => {
    setEditUser(u);
    setNewLevel(u.admin_level || 'moderator');
    setNewStatus(u.status || 'active');
  };

  const saveChanges = async () => {
    if (!editUser) return;
    try {
      const res = await authFetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_level: newLevel, status: newStatus })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update admin');
      }
      showToast('Updated', `${editUser.name} updated.`, 'success');
      setEditUser(null);
      fetchAdmins();
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const rank = { moderator: 1, admin: 2, super_admin: 3 }[currentUser?.admin_level || 'moderator'] || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCog size={24} className="text-indigo-600" /> Admin Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage the administrator team. Only Super Admins can change admin roles.
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold">
          <ShieldAlert size={16} /> You have read-only access to this section.
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search admins by name or email..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <DataTable<User>
        loading={loading}
        rows={rows}
        total={total}
        page={page}
        pageSize={limit}
        onPage={setPage}
        rowKey={(u) => u.id}
        emptyMessage="No admin accounts found."
        columns={[
          {
            key: 'name',
            header: 'Admin',
            render: (u) => (
              <div className="flex items-center gap-3">
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {u.name}
                    {u.id === currentUser?.id && <span className="ml-1.5 text-[10px] text-indigo-500 font-bold">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
            )
          },
          {
            key: 'admin_level',
            header: 'Level',
            render: (u) => {
              const m = LEVEL_META[u.admin_level || 'moderator'];
              return <span className={`px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${m.cls}`}>{m.icon} {m.label}</span>;
            }
          },
          {
            key: 'status',
            header: 'Status',
            render: (u) => (
              <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${(u.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {(u.status || 'active') === 'active' ? 'Active' : 'Suspended'}
              </span>
            )
          },
          {
            key: 'created_at',
            header: 'Joined',
            render: (u) => <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</span>
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (u) => (
              <button
                onClick={() => openEdit(u)}
                disabled={!isSuperAdmin}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Manage
              </button>
            )
          }
        ]}
      />

      {editUser && (
        <Modal
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          title={`Manage ${editUser.name}`}
          subtitle={editUser.email}
          maxWidth="sm"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Admin Level</label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as AdminLevel)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="super_admin">Super Admin — full access incl. other admins</option>
                <option value="admin">Admin — advanced access</option>
                <option value="moderator">Moderator — limited access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'active' | 'suspended')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {editUser.id === currentUser?.id && (
              <p className="text-[11px] text-amber-600 font-semibold">
                Warning: changing your own level or suspending yourself may lock you out of the admin console.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button
                onClick={saveChanges}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};