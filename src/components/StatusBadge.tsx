import React from 'react';
import { ApplicationStatus } from '../types';
import { Sparkles, Eye, Calendar, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'new':
        return {
          label: 'New Application',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: Sparkles
        };
      case 'reviewing':
        return {
          label: 'Under Review',
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
          icon: Eye
        };
      case 'interview':
        return {
          label: 'Interviewing',
          bg: 'bg-sky-50 text-sky-900 border-sky-300',
          dot: 'bg-sky-500',
          icon: Calendar
        };
      case 'offer':
        return {
          label: 'Offer Extended',
          bg: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-600',
          icon: CheckCircle2
        };
      case 'rejected':
      case 'closed':
        return {
          label: 'Closed / Rejected',
          bg: 'bg-rose-50 text-rose-900 border-rose-200',
          dot: 'bg-rose-500',
          icon: XCircle
        };
      case 'active':
        return {
          label: 'Active',
          bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: CheckCircle2
        };
      case 'suspended':
        return {
          label: 'Suspended',
          bg: 'bg-rose-50 text-rose-900 border-rose-300',
          dot: 'bg-rose-600',
          icon: ShieldAlert
        };
      default:
        return {
          label: st,
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
          icon: Sparkles
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold'
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${sizeClasses} transition-colors whitespace-nowrap`}
    >
      {showIcon && <Icon size={iconSizes} className="shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};
