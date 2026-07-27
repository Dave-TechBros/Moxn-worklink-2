import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
  ChevronRight,
  Sparkles,
  MapPin,
  Building2,
  History,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';

interface CandidateApplicationsTrackerProps {
  onBrowseJobs: () => void;
}

export const CandidateApplicationsTracker: React.FC<CandidateApplicationsTrackerProps> = ({
  onBrowseJobs
}) => {
  const { authFetch, currentUser } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/candidate/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
        if (data.length > 0) setSelectedApp(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [currentUser]);

  const pipelineStages: { key: ApplicationStatus; label: string }[] = [
    { key: 'new', label: 'Applied' },
    { key: 'reviewing', label: 'Under Review' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer Extended' }
  ];

  const getStageIndex = (st: ApplicationStatus) => {
    if (st === 'rejected') return -1;
    return pipelineStages.findIndex((s) => s.key === st);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Application Tracker
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time status updates and verifiable transition audit history for all submitted applications.
          </p>
        </div>

        <button
          onClick={onBrowseJobs}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles size={16} />
          <span>Browse More Roles</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center animate-pulse">
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto mb-4"></div>
          <div className="h-4 w-64 bg-slate-100 rounded mx-auto"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && applications.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No applications submitted yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Explore active positions across companies and apply with your profile and resume.
          </p>
          <button
            onClick={onBrowseJobs}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Explore Open Listings
          </button>
        </div>
      )}

      {/* Application Grid layout: List on Left, Detail & Timeline on Right */}
      {!loading && applications.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Applications List */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Submitted Applications ({applications.length})
            </h2>

            {applications.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/10'
                      : 'bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">
                        {app.job_title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {app.company_name}
                      </p>
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {app.location || 'San Francisco, CA'}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock size={12} /> {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Application Detail & Pipeline Timeline */}
          {selectedApp && (
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                {/* Header Info */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {selectedApp.company_name}
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {selectedApp.job_title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Applied on {new Date(selectedApp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={selectedApp.status} size="lg" />
                </div>

                {/* Pipeline Visual Bar */}
                <div className="py-6 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Pipeline Progression
                  </h3>

                  {selectedApp.status === 'rejected' ? (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-900 text-xs font-medium">
                      <XCircle size={18} className="text-rose-600 shrink-0" />
                      <span>
                        This application has been closed or marked rejected. You can re-apply if a new matching position is posted.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {pipelineStages.map((stage, idx) => {
                        const currentStageIdx = getStageIndex(selectedApp.status);
                        const isDone = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        return (
                          <div key={stage.key} className="relative">
                            <div
                              className={`h-2 rounded-full mb-2 transition-colors ${
                                isCurrent
                                  ? 'bg-indigo-600 ring-2 ring-indigo-200'
                                  : isDone
                                  ? 'bg-indigo-500'
                                  : 'bg-slate-200'
                              }`}
                            ></div>
                            <span
                              className={`text-[11px] font-bold block ${
                                isCurrent
                                  ? 'text-indigo-700 font-extrabold'
                                  : isDone
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Status History Audit Trail */}
                <div className="py-6 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                    <History size={14} /> Status History Audit Trail
                  </h3>

                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {selectedApp.status_history.map((hist) => (
                      <div key={hist.id} className="relative pl-8 text-xs">
                        <div className="absolute left-1.5 top-0.5 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white"></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Status moved to: {hist.to_status.toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(hist.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 leading-relaxed">{hist.note}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            Updated by: {hist.updated_by_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cover Note & Resume */}
                <div className="pt-6 space-y-4 text-xs">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Attached Resume File
                    </span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <FileText size={16} className="text-indigo-600" />
                      {selectedApp.resume_file_name || 'Resume_Document.pdf'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Submitted Cover Note
                    </span>
                    <p className="text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                      "{selectedApp.cover_note}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
