import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DataTable } from './ui/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { User, Application, CandidateProfile, Company } from '../../types';
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Ban,
  RotateCcw,
  Trash2,
  Eye,
  Bell,
  KeyRound,
  ChevronDown,
  X,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  History
} from 'lucide-react';

type RoleFilter = 'all' | 'candidate' | 'employer' | 'admin';
type StatusFilter = 'all' | 'active' | 'suspended';

interface Props {
  initialRole?: RoleFilter;
}

export const AdminUsers: React.FC<Props> = ({ initialRole = 'all' }) => {
  const { authFetch, currentUser } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<RoleFilter>(initialRole);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [verified, setVerified] = useState<'all' | 'true' | 'false'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailProfile, setDetailProfile] = useState<CandidateProfile | null>(null);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);
  const [detailApps, setDetailApps] = useState<Application[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  // Action modals
  const [confirmAction, setConfirmAction] = useState<null | {
    user: User;
    type: 'suspend' | 'reactivate' | 'delete' | 'verify' | 'unverify';
  }>(null);
  const [notifyUser, setNotifyUser] = useState<User | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  const adminLevel = currentUser?.admin_level || 'moderator';
  const canManage = adminLevel === 'super_admin' || adminLevel === 'admin';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        status,
        verified,
        search,
        sort: sortKey,
        dir: sortDir,
        page: String(page),
        limit: String(limit)
      });
      const res = await authFetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, role, status, verified, search, sortKey, sortDir, page, limit, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const openDetail = async (user: User) => {
    try {
      const res = await authFetch(`/api/admin/users/${user.id}`);
      if (!res.ok) throw new Error('Failed to load user details');
      const data = await res.json();
      setDetailUser(data.user);
      setDetailProfile(data.profile);
      setDetailCompany(data.company);
      setDetailApps(data.applications || []);
      setDetailOpen(true);
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { user, type } = confirmAction;
    try {
      let res;
      if (type === 'suspend' || type === 'reactivate') {
        res = await authFetch(`/api/admin/users/${user.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: type === 'suspend' ? 'suspended' : 'active' })
        });
      } else if (type === 'verify' || type === 'unverify') {
        res = await authFetch(`/api/admin/users/${user.id}/verified`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verified: type === 'verify' })
        });
      } else if (type === 'delete') {
        res = await authFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      }
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || 'Action failed');
      }
      showToast('Success', type === 'delete' ? 'User deleted.' : 'User updated.', 'success');
      setConfirmAction(null);
      fetchUsers();
      if (detailOpen) setDetailOpen(false);
    } catch (e: any) {
      showToast('Error', e.message, 'error');
      setConfirmAction(null);
    }
  };

  const sendNotify = async () => {
    if (!notifyUser || !notifyTitle.trim() || !notifyBody.trim()) return;
    try {
      const res = await authFetch(`/api/admin/users/${notifyUser.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifyTitle, body: notifyBody })
      });
      if (!res.ok) throw new Error('Failed to send notification');
      showToast('Notification Sent', `Message delivered to ${notifyUser.name}.`, 'success');
      setNotifyOpen(false);
      setNotifyUser(null);
      setNotifyTitle('');
      setNotifyBody('');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const doReset = async () => {
    if (!resetUser || resetPassword.length < 4) return;
    try {
      const res = await authFetch(`/api/admin/users/${resetUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword })
      });
      if (!res.ok) throw new Error('Failed to reset password');
      showToast('Password Reset', `Password updated for ${resetUser.name}.`, 'success');
      setResetOpen(false);
      setResetUser(null);
      setResetPassword('');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const isSelf = (u: User) => u.id === currentUser?.id;

  const actionButtons = (u: User) => {
    if (isSelf(u)) return <span className="text-[11px] text-slate-400 font-semibold">You</span>;
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => openDetail(u)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
          title="View details"
        >
          <Eye size={15} />
        </button>
        <button
          onClick={() => { setNotifyUser(u); setNotifyOpen(true); }}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
          title="Send notification"
        >
          <Bell size={15} />
        </button>
        {canManage && (
          <>
            <button
              onClick={() => { setResetUser(u); setResetOpen(true); }}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors cursor-pointer"
              title="Reset password"
            >
              <KeyRound size={15} />
            </button>
            <button
              onClick={() => setConfirmAction({
                user: u,
                type: u.verified ? 'unverify' : 'verify'
              })}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
              title={u.verified ? 'Remove verification' : 'Verify user'}
            >
              {u.verified ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
            </button>
            <button
              onClick={() => setConfirmAction({
                user: u,
                type: (u.status || 'active') === 'suspended' ? 'reactivate' : 'suspend'
              })}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title={(u.status || 'active') === 'suspended' ? 'Reactivate' : 'Suspend'}
            >
              {(u.status || 'active') === 'suspended' ? <RotateCcw size={15} /> : <Ban size={15} />}
            </button>
            <button
              onClick={() => setConfirmAction({ user: u, type: 'delete' })}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete permanently"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {initialRole === 'employer' ? 'Employer Management' : initialRole === 'candidate' ? 'Job Seeker Management' : 'User Management'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search, filter, moderate, verify, and manage every account on the platform.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or user ID..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value as RoleFilter); setPage(1); }}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="candidate">Job Seekers</option>
            <option value="employer">Employers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={verified}
            onChange={(e) => { setVerified(e.target.value as 'all' | 'true' | 'false'); setPage(1); }}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">Verified + Unverified</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
        </div>
      </div>

      <DataTable<User>
        loading={loading}
        rows={rows}
        total={total}
        page={page}
        pageSize={limit}
        onPage={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(u) => u.id}
        emptyMessage="No users match the current filters."
        columns={[
          {
            key: 'name',
            header: 'User',
            sortable: true,
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
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {u.name}
                    {u.verified && <ShieldCheck size={13} className="text-emerald-500" />}
                  </p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
            )
          },
          {
            key: 'role',
            header: 'Role',
            sortable: true,
            render: (u) => (
              <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
                u.role === 'admin' ? 'bg-rose-50 text-rose-700' :
                u.role === 'employer' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {u.role}
              </span>
            )
          },
          {
            key: 'admin_level',
            header: 'Level',
            render: (u) => u.admin_level ? (
              <span className="text-[11px] font-bold text-indigo-600 uppercase">{u.admin_level.replace('_', ' ')}</span>
            ) : <span className="text-slate-300">—</span>
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (u) => (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold ${
                (u.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(u.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {(u.status || 'active') === 'active' ? 'Active' : 'Suspended'}
              </span>
            )
          },
          {
            key: 'created_at',
            header: 'Joined',
            sortable: true,
            render: (u) => <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</span>
          },
          {
            key: 'last_login_at',
            header: 'Last Login',
            sortable: true,
            render: (u) => <span className="text-xs text-slate-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}</span>
          },
          {
            key: 'actions',
            header: 'Actions',
            render: actionButtons
          }
        ]}
      />

      {/* User detail modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={detailUser?.name} subtitle={detailUser?.email} maxWidth="2xl">
        {detailUser && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${detailUser.role === 'admin' ? 'bg-rose-50 text-rose-700' : detailUser.role === 'employer' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {detailUser.role}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${(detailUser.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {(detailUser.status || 'active') === 'active' ? 'Active' : 'Suspended'}
              </span>
              {detailUser.verified && (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-indigo-50 text-indigo-700">Verified</span>
              )}
              {detailUser.admin_level && (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-slate-100 text-slate-600">
                  {detailUser.admin_level.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-600"><Mail size={14} className="text-slate-400" /> {detailUser.email}</div>
              <div className="flex items-center gap-2 text-slate-600"><History size={14} className="text-slate-400" /> Joined {new Date(detailUser.created_at).toLocaleString()}</div>
            </div>

            {detailProfile && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Candidate Profile</p>
                <p className="font-bold text-slate-900">{detailProfile.headline || 'No headline'}</p>
                {detailProfile.location && (
                  <p className="text-slate-600 flex items-center gap-1.5"><MapPin size={13} /> {detailProfile.location}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(detailProfile.skills || []).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">{s}</span>
                  ))}
                </div>
                <p className="text-slate-600 italic leading-relaxed">{detailProfile.bio}</p>
              </div>
            )}

            {detailCompany && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Company</p>
                <div className="flex items-center gap-3">
                  <img src={detailCompany.logo} alt={detailCompany.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <p className="font-bold text-slate-900">{detailCompany.name}</p>
                    <p className="text-slate-500">{detailCompany.industry} · {detailCompany.location}</p>
                  </div>
                </div>
                <p className="text-slate-600 flex items-center gap-1.5"><Globe size={13} /> {detailCompany.website}</p>
              </div>
            )}

            {detailApps.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Application History ({detailApps.length})</p>
                <div className="space-y-2">
                  {detailApps.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{a.job_title}</p>
                        <p className="text-slate-400">{a.company_name} · Applied {new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold uppercase text-[10px]">{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setDetailOpen(false); setNotifyUser(detailUser); setNotifyOpen(true); }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Send Notification
              </button>
              {canManage && (
                <button
                  onClick={() => setConfirmAction({ user: detailUser, type: (detailUser.status || 'active') === 'suspended' ? 'reactivate' : 'suspend' })}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {(detailUser.status || 'active') === 'suspended' ? 'Reactivate' : 'Suspend'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm action dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeConfirmAction}
          title={confirmAction.type === 'suspend' ? `Suspend ${confirmAction.user.name}?` :
                 confirmAction.type === 'reactivate' ? `Reactivate ${confirmAction.user.name}?` :
                 confirmAction.type === 'delete' ? `Delete ${confirmAction.user.name}?` :
                 confirmAction.type === 'verify' ? `Verify ${confirmAction.user.name}?` : `Unverify ${confirmAction.user.name}?`}
          message={confirmAction.type === 'delete'
            ? 'This permanently removes the account, profile, and applications. This cannot be undone.'
            : confirmAction.type === 'suspend'
            ? 'Suspended accounts cannot sign in or perform actions until reactivated.'
            : confirmAction.type === 'reactivate'
            ? 'The account will be restored to full access.'
            : confirmAction.type === 'verify'
            ? 'The account will be marked as verified and receive a verified badge.'
            : 'The verified badge will be removed from this account.'}
          confirmLabel={confirmAction.type === 'delete' ? 'Delete' :
            confirmAction.type === 'suspend' ? 'Suspend' :
            confirmAction.type === 'reactivate' ? 'Reactivate' :
            confirmAction.type === 'verify' ? 'Verify' : 'Unverify'}
          isDestructive={confirmAction.type === 'delete' || confirmAction.type === 'suspend'}
        />
      )}

      {/* Notify modal */}
      <Modal isOpen={notifyOpen} onClose={() => setNotifyOpen(false)} title={`Notify ${notifyUser?.name || ''}`} subtitle="Send a direct platform notification" maxWidth="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
            <input
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="e.g. Your profile was approved"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Message</label>
            <textarea
              rows={4}
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              placeholder="Write a short message..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setNotifyOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
            <button onClick={sendNotify} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">Send</button>
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title={`Reset Password — ${resetUser?.name || ''}`} subtitle="Set a new temporary password" maxWidth="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
            <input
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setResetOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
            <button onClick={doReset} disabled={resetPassword.length < 4} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer">Reset Password</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};