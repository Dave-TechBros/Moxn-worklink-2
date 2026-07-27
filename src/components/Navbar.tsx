import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MoxnLogo } from './MoxnLogo';
import {
  UserCheck,
  Building2,
  ShieldAlert,
  ChevronDown,
  Layers,
  FileText,
  Search,
  PlusCircle,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  Home
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth?: (mode?: 'signin' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const { currentUser, currentCompany, availableUsers, switchUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getNavItems = () => {
    if (!currentUser) {
      return [
        { id: 'landing', label: 'Home', icon: Home },
        { id: 'jobs', label: 'Explore Roles', icon: Search }
      ];
    }

    if (currentUser.role === 'candidate') {
      return [
        { id: 'jobs', label: 'Explore Roles', icon: Search },
        { id: 'applications', label: 'My Applications', icon: Layers },
        { id: 'profile', label: 'Candidate Profile & Resume', icon: FileText }
      ];
    } else if (currentUser.role === 'employer') {
      return [
        { id: 'employer-dashboard', label: 'Manage Listings', icon: LayoutDashboard },
        { id: 'employer-post-job', label: 'Post New Role', icon: PlusCircle },
        { id: 'employer-pipeline', label: 'Applicant Pipeline', icon: UserCheck }
      ];
    } else if (currentUser.role === 'admin') {
      return [
        { id: 'admin-dashboard', label: 'Platform Moderation', icon: ShieldAlert },
        { id: 'jobs', label: 'All Listings View', icon: Search },
        { id: 'admin-companies', label: 'Company Registry', icon: Building2 }
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    setActiveTab('landing');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                if (!currentUser) setActiveTab('landing');
                else if (currentUser.role === 'candidate') setActiveTab('jobs');
                else if (currentUser.role === 'employer') setActiveTab('employer-dashboard');
                else setActiveTab('admin-dashboard');
              }}
              className="flex items-center gap-2.5 group cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-900 group-hover:scale-105 transition-transform">
                <MoxnLogo size={20} />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  Moxn Worklink
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Career Marketplace
                </span>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-indigo-200' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Right Header Section: Unauthenticated vs Logged In */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-left transition-colors cursor-pointer"
                aria-expanded={dropdownOpen}
                aria-label="Account details and switcher"
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-500/50 shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-xs">
                  <p className="font-semibold text-slate-100 leading-none">{currentUser.name}</p>
                  <p className="text-[11px] text-indigo-300 font-medium capitalize mt-0.5">
                    {currentUser.role === 'employer'
                      ? `Employer (${currentCompany?.name || 'TechFlow'})`
                      : currentUser.role === 'admin'
                      ? 'Platform Admin'
                      : 'Candidate'}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>

              {/* Account Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-2 divide-y divide-slate-800">
                  <div className="px-4 py-2.5">
                    <p className="font-bold text-slate-100 text-xs">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
                      {currentUser.role}
                    </span>
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'candidate' && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('profile');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileText size={14} className="text-slate-400" />
                        <span>Candidate Profile & Resume</span>
                      </button>
                    )}
                    {currentUser.role === 'employer' && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('employer-dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LayoutDashboard size={14} className="text-slate-400" />
                        <span>Employer Dashboard</span>
                      </button>
                    )}
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('admin-dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ShieldAlert size={14} className="text-slate-400" />
                        <span>Admin Moderation Panel</span>
                      </button>
                    )}
                  </div>

                  {/* Sign Out Button */}
                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-950/50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Log Out / Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth && onOpenAuth('signin')}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => onOpenAuth && onOpenAuth('register')}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 py-2 px-2 bg-slate-950">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon size={18} />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
