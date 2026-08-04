import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  iconClass?: string;
  accent?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'slate';
}

const accentMap: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  slate: 'bg-slate-100 text-slate-600'
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'indigo'
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${accentMap[accent]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};