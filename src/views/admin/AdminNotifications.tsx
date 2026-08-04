import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { PlatformNotification } from '../../types';
import { Send, Megaphone, Users, Building2, User as UserIcon, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

const AUDIENCE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  all: { label: 'Everyone', icon: <Users size={13} />, cls: 'bg-indigo-50 text-indigo-700' },
  candidate: { label: 'Job Seekers', icon: <UserIcon size={13} />, cls: 'bg-emerald-50 text-emerald-700' },
  employer: { label: 'Employers', icon: <Building2 size={13} />, cls: 'bg-sky-50 text-sky-700' },
  admin: { label: 'Admins', icon: <ShieldCheck size={13} />, cls: 'bg-rose-50 text-rose-700' },
  user: { label: 'Specific User', icon: <UserIcon size={13} />, cls: 'bg-slate-100 text-slate-700' }
};

export const AdminNotifications: React.FC = () => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [notifs, setNotifs] = useState<PlatformNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'candidate' | 'employer' | 'admin' | 'user'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/notifications');
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await authFetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audience,
          target_user_id: audience === 'user' ? targetUserId.trim() || undefined : undefined
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to send notification');
      }
      showToast('Sent', 'Notification queued and delivered.', 'success');
      setComposeOpen(false);
      setTitle('');
      setBody('');
      setAudience('all');
      setTargetUserId('');
      fetchNotifs();
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Broadcast platform-wide announcements or message specific users.
          </p>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Send size={15} /> Compose
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          Loading notifications...
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <Megaphone size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-500">No notifications sent yet</p>
          <p className="text-xs text-slate-400 mt-1">Compose your first broadcast above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notifs.map((n) => {
            const am = AUDIENCE_META[n.audience] || AUDIENCE_META.all;
            return (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${am.cls}`}>
                    {am.icon} {am.label}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">{n.body}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{n.scheduled_for ? (
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> Scheduled {new Date(n.scheduled_for).toLocaleString()}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} /> Sent</span>
                  )}</span>
                  <span>by {n.created_by_name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose Notification"
        subtitle="Broadcast to a platform audience"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['all', 'candidate', 'employer', 'admin'] as const).map((a) => {
                const am = AUDIENCE_META[a];
                return (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-colors cursor-pointer ${
                      audience === a
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {am.icon} {am.label}
                  </button>
                );
              })}
            </div>
          </div>

          {audience === 'user' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">User ID</label>
              <input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="e.g. user-cand-1"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">You can find user IDs in User Management.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Welcome to the new platform"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Message</label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setComposeOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
              Cancel
            </button>
            <button
              onClick={sendNotification}
              disabled={!title.trim() || !body.trim() || sending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              <Send size={13} /> {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};