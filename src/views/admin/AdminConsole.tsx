import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, AdminSection } from './AdminLayout';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminJobs } from './AdminJobs';
import { AdminApplications } from './AdminApplications';
import { AdminReports } from './AdminReports';
import { AdminNotifications } from './AdminNotifications';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminAdmins } from './AdminAdmins';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminSettings } from './AdminSettings';

interface Props {
  section?: AdminSection;
  onSectionChange?: (s: AdminSection) => void;
  onExitAdmin: () => void;
}

export const AdminConsole: React.FC<Props> = ({ section, onSectionChange, onExitAdmin }) => {
  const { currentUser } = useAuth();
  const [internalSection, setInternalSection] = useState<AdminSection>('overview');

  const activeSection = section || internalSection;

  const handleNavigate = (s: AdminSection) => {
    if (onSectionChange) onSectionChange(s);
    else setInternalSection(s);
  };

  // RBAC hard-gate: only admin role may render the console.
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <h1 className="text-lg font-extrabold text-slate-900">Access Restricted</h1>
          <p className="text-sm text-slate-500 mt-2">
            Only members of the administrator team can access the admin console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout section={activeSection} onNavigate={handleNavigate} onExitAdmin={onExitAdmin}>
      {activeSection === 'overview' && <AdminOverview />}
      {activeSection === 'users' && <AdminUsers />}
      {activeSection === 'employers' && <AdminUsers initialRole="employer" />}
      {activeSection === 'employees' && <AdminUsers initialRole="candidate" />}
      {activeSection === 'jobs' && <AdminJobs />}
      {activeSection === 'applications' && <AdminApplications />}
      {activeSection === 'reports' && <AdminReports />}
      {activeSection === 'notifications' && <AdminNotifications />}
      {activeSection === 'analytics' && <AdminAnalytics />}
      {activeSection === 'admins' && <AdminAdmins />}
      {activeSection === 'audit' && <AdminAuditLogs />}
      {activeSection === 'settings' && <AdminSettings />}
    </AdminLayout>
  );
};