import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { PlatformSettings } from '../../types';
import { Save, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { authFetch, currentUser } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = currentUser?.admin_level === 'admin' || currentUser?.admin_level === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      setSettings(await res.json());
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to load settings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (patch: Partial<PlatformSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_name: settings.platform_name,
          platform_tagline: settings.platform_tagline,
          contact_email: settings.contact_email,
          announcement: settings.announcement,
          registration_enabled: settings.registration_enabled,
          job_approval_required: settings.job_approval_required,
          maintenance_mode: settings.maintenance_mode,
          email_notifications_enabled: settings.email_notifications_enabled,
          max_resume_size_mb: settings.max_resume_size_mb
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save settings');
      }
      showToast('Saved', 'Platform settings updated.', 'success');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return <p className="text-center py-16 text-slate-500 text-sm">Settings unavailable.</p>;
  }

  const toggle = (key: 'registration_enabled' | 'job_approval_required' | 'maintenance_mode' | 'email_notifications_enabled') => ({
    value: settings[key],
    onChange: () => update({ [key]: !settings[key] } as Partial<PlatformSettings>),
    disabled: !canEdit
  });

  const toggles: { key: 'registration_enabled' | 'job_approval_required' | 'maintenance_mode' | 'email_notifications_enabled'; title: string; desc: string }[] = [
    { key: 'registration_enabled', title: 'Public Registration', desc: 'Allow new users to create accounts on the platform.' },
    { key: 'job_approval_required', title: 'Job Approval Required', desc: 'Force moderator approval before jobs go live.' },
    { key: 'maintenance_mode', title: 'Maintenance Mode', desc: 'Temporarily take the platform offline for maintenance.' },
    { key: 'email_notifications_enabled', title: 'Email Notifications', desc: 'Enable automated email notifications to users.' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage branding, contact info, announcements, and platform-wide policies.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold">
          <ShieldCheck size={16} /> You have read-only access. An Admin or Super Admin can edit these settings.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-900">Branding & Contact</h3>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Platform Name</label>
            <input
              value={settings.platform_name}
              onChange={(e) => update({ platform_name: e.target.value })}
              disabled={!canEdit}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tagline</label>
            <input
              value={settings.platform_tagline}
              onChange={(e) => update({ platform_tagline: e.target.value })}
              disabled={!canEdit}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Contact Email</label>
            <input
              value={settings.contact_email}
              onChange={(e) => update({ contact_email: e.target.value })}
              disabled={!canEdit}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Announcement Banner</label>
            <textarea
              rows={3}
              value={settings.announcement}
              onChange={(e) => update({ announcement: e.target.value })}
              disabled={!canEdit}
              placeholder="Shown to all users"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:opacity-50"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900">Platform Policies</h3>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Max Resume Upload (MB)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.max_resume_size_mb}
              onChange={(e) => update({ max_resume_size_mb: Number(e.target.value) || 10 })}
              disabled={!canEdit}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
            />
          </div>
          <div className="space-y-4">
            {toggles.map((t) => {
              const state = toggle(t.key);
              return (
                <div key={t.key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                  </div>
                  <button
                    onClick={state.onChange}
                    disabled={state.disabled}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-50 relative shrink-0 ${
                      state.value ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    aria-pressed={state.value}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        state.value ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
        <SettingsIcon size={14} /> Last updated {new Date(settings.updated_at).toLocaleString()}
      </div>
    </div>
  );
};