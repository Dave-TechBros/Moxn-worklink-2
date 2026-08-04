import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MoxnLogo } from '../../components/MoxnLogo';
import { useToast } from '../../components/Toast';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileText,
  ShieldAlert,
  Bell,
  BarChart3,
  UserCog,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'users'
  | 'employers'
  | 'employees'
  | 'jobs'
  | 'applications'
  | 'reports'
  | 'notifications'
  | 'analytics'
  | 'admins'
  | 'audit'
  | 'settings';

interface AdminLayoutProps {
  section: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  minLevel: 'moderator' | 'admin' | 'super_admin';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  section,
  onNavigate,
  onExitAdmin,
  children
}) => {
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminLevel = currentUser?.admin_level || 'moderator';
  const rank = { moderator: 1, admin: 2, super_admin: 3 }[adminLevel] || 1;

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, minLevel: 'moderator' },
    { id: 'users', label: 'All Users', icon: Users, minLevel: 'moderator' },
    { id: 'employers', label: 'Employers', icon: Building2, minLevel: 'moderator' },
    { id: 'employees', label: 'Job Seekers', icon: Users, minLevel: 'moderator' },
    { id: 'jobs', label: 'Job Postings', icon: Briefcase, minLevel: 'moderator' },
    { id: 'applications', label: 'Applications', icon: FileText, minLevel: 'moderator' },
    { id: 'reports', label: 'Reports & Moderation', icon: ShieldAlert, minLevel: 'moderator' },
    { id: 'notifications', label: 'Notifications', icon: Bell, minLevel: 'moderator' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, minLevel: 'moderator' },
    { id: 'admins', label: 'Admin Management', icon: UserCog, minLevel: 'super_admin' },
    { id: 'audit', label: 'Audit Logs', icon: ScrollText, minLevel: 'admin' },
    { id: 'settings', label: 'Settings', icon: Settings, minLevel: 'admin' }
  ];

  const visibleNav = navItems.filter((n) => rank >= ({ moderator: 1, admin: 2, super_admin: 3 }[n.minLevel] || 1));
  const currentLabel = visibleNav.find((n) => n.id === section)?.label || 'Admin';

  const handleLogout = () => {
    logout();
    onExitAdmin();
    showToast('Logged Out', 'You have been signed out of the admin console.', 'info');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white">
          <MoxnLogo size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Moxn Admin</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mt-0.5">
            Control Center
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-indigo-600/90 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon size={17} className={active ? 'text-indigo-200' : 'text-slate-500'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 shrink-0 space-y-2">
        <div className="px-3 py-2.5 rounded-xl bg-slate-800/60">
          <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
          <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider mt-0.5">
            {adminLevel.replace('_', ' ')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut size={14} /> Sign Out
          </button>
          <button
            onClick={onExitAdmin}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Exit
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">{sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 z-10">{sidebar}</aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Admin Console</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-700">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              <ShieldCheck size={13} /> RBAC Enforced
            </span>
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-200">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
};