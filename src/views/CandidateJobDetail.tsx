import React, { useState, useEffect } from 'react';
import { Job, Application } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  DollarSign,
  Building2,
  Globe,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface CandidateJobDetailProps {
  job: Job;
  onBack: () => void;
  onOpenApplyModal: (job: Job) => void;
  onOpenReportModal: (job: Job) => void;
  onGoToTracker: () => void;
}

export const CandidateJobDetail: React.FC<CandidateJobDetailProps> = ({
  job,
  onBack,
  onOpenApplyModal,
  onOpenReportModal,
  onGoToTracker
}) => {
  const { authFetch, currentUser } = useAuth();
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [checkingApp, setCheckingApp] = useState<boolean>(true);

  useEffect(() => {
    const checkUserApplication = async () => {
      if (!currentUser || currentUser.role !== 'candidate') {
        setCheckingApp(false);
        return;
      }

      try {
        const res = await authFetch('/api/candidate/applications');
        if (res.ok) {
          const userApps: Application[] = await res.json();
          const match = userApps.find((a) => a.job_id === job.id);
          setExistingApp(match || null);
        }
      } catch (err) {
        console.error('Error checking existing application:', err);
      } finally {
        setCheckingApp(false);
      }
    };

    checkUserApplication();
  }, [job.id, currentUser]);

  const formatSalary = (min: number, max: number) => {
    return `$${min.toLocaleString()} - $${max.toLocaleString()} / year`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation Back Link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors cursor-pointer group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Job Search</span>
      </button>

      {/* Hero Role Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-5">
            <img
              src={job.company_logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150'}
              alt={job.company_name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-indigo-600 tracking-wide">
                  {job.company_name}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {job.location_type}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-slate-400" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase size={16} className="text-slate-400" />
                  {job.employment_type}
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <DollarSign size={15} className="text-emerald-600 -mr-1" />
                  {formatSalary(job.salary_min, job.salary_max)}
                </span>
              </div>
            </div>
          </div>

          {/* Primary CTA (Fitts's Law) */}
          <div className="w-full sm:w-auto shrink-0 flex flex-col items-stretch sm:items-end gap-3">
            {existingApp ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-left sm:text-right">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-900">Application Submitted</span>
                </div>
                <div className="mt-2">
                  <StatusBadge status={existingApp.status} size="sm" />
                </div>
                <button
                  onClick={onGoToTracker}
                  className="mt-3 text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Track Application Progress</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenApplyModal(job)}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Sparkles size={20} />
                <span>Apply for this Role</span>
              </button>
            )}

            <button
              onClick={() => onOpenReportModal(job)}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium inline-flex items-center justify-center gap-1 py-1"
            >
              <ShieldAlert size={14} />
              <span>Report this Listing</span>
            </button>
          </div>
        </div>

        {/* Quick Tags */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              {tag}
            </span>
          ))}
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <Clock size={13} /> Posted {new Date(job.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Job Description */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              Role Overview & Responsibilities
            </h2>
            <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              Candidate Requirements & Qualifications
            </h2>
            <ul className="space-y-3">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 leading-snug">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </div>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Company Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              About the Hiring Company
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={job.company_logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150'}
                alt={job.company_name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{job.company_name}</h4>
                <p className="text-xs text-slate-500">Verified Employer</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              TechFlow builds next-generation real-time analytics engines and developer infrastructure for high-growth engineering teams worldwide.
            </p>

            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Location:</span>
                <span className="font-semibold text-slate-800">{job.location}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Industry:</span>
                <span className="font-semibold text-slate-800">Enterprise Software</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
