import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ApplicantDetailModal } from '../components/ApplicantDetailModal';
import {
  Users,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  X,
  Building2,
  MapPin,
  History,
  MessageSquare,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface EmployerKanbanPipelineProps {
  initialJobId?: string;
  onBackToDashboard: () => void;
}

export const EmployerKanbanPipeline: React.FC<EmployerKanbanPipelineProps> = ({
  initialJobId,
  onBackToDashboard
}) => {
  const { authFetch, currentCompany } = useAuth();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || 'all');
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Candidate Drawer & Modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Confirm Destructive Transition Dialog State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    app: Application;
    targetStatus: ApplicationStatus;
  } | null>(null);

  // Internal Note Editor State
  const [internalNote, setInternalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        authFetch('/api/jobs?status=all'),
        authFetch('/api/employer/applications')
      ]);

      if (jobsRes.ok) {
        const allJobs: Job[] = await jobsRes.json();
        setJobs(allJobs);
      }

      if (appsRes.ok) {
        const allApps: Application[] = await appsRes.json();
        setApplications(allApps);
        if (allApps.length > 0 && !selectedApp) {
          setSelectedApp(allApps[0]);
          setInternalNote(allApps[0].internal_notes || '');
        }
      }
    } catch (err) {
      console.error('Error loading pipeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedJobId]);

  const columns: { key: ApplicationStatus; title: string; color: string }[] = [
    { key: 'new', title: 'New Applications', color: 'border-t-indigo-500 bg-indigo-50/20' },
    { key: 'reviewing', title: 'Under Review', color: 'border-t-amber-500 bg-amber-50/20' },
    { key: 'interview', title: 'Interviewing', color: 'border-t-sky-500 bg-sky-50/20' },
    { key: 'offer', title: 'Offer Extended', color: 'border-t-emerald-500 bg-emerald-50/20' },
    { key: 'rejected', title: 'Closed / Rejected', color: 'border-t-rose-500 bg-rose-50/20' }
  ];

  // Filtered applications by job selector
  const filteredApps =
    selectedJobId === 'all'
      ? applications
      : applications.filter((a) => a.job_id === selectedJobId);

  // State Machine Transition Handler
  const executeMoveStatus = async (
    app: Application,
    targetStatus: ApplicationStatus,
    force: boolean = false
  ) => {
    try {
      const res = await authFetch(`/api/applications/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_status: targetStatus,
          note: `Moved application to ${targetStatus}`,
          force
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requires_force) {
          // Open confirm dialog for non-sequential jump
          setPendingMove({ app, targetStatus });
          setConfirmModalOpen(true);
          return;
        }
        throw new Error(data.error || 'Transition failed');
      }

      showToast(
        'Pipeline Updated',
        `Moved ${app.candidate_name} to status '${targetStatus.toUpperCase()}'. Audit history logged.`,
        'success'
      );

      // Refresh applications data
      await fetchData();
      if (selectedApp?.id === app.id) {
        setSelectedApp(data.application);
      }
    } catch (err: any) {
      showToast('Transition Error', err.message, 'error');
    }
  };

  const handleConfirmForcedMove = async () => {
    if (pendingMove) {
      await executeMoveStatus(pendingMove.app, pendingMove.targetStatus, true);
      setPendingMove(null);
    }
  };

  const handleSaveInternalNote = async () => {
    if (!selectedApp) return;
    setSavingNote(true);
    try {
      const res = await authFetch(`/api/applications/${selectedApp.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: internalNote })
      });

      if (!res.ok) throw new Error('Failed to save notes');

      showToast('Note Saved', 'Internal note updated for candidate.', 'success');
      selectedApp.internal_notes = internalNote;
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 mb-1 inline-flex items-center gap-1 cursor-pointer"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Applicant Kanban Pipeline
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Enforced state machine transitions (`new → reviewing → interview → offer`). Drag or click to advance candidates.
          </p>
        </div>

        {/* Job Filter Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Filter Position:
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Company Positions ({applications.length} candidates)</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.applicant_count || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
        {columns.map((col) => {
          const colApps = filteredApps.filter((a) => a.status === col.key);

          return (
            <div
              key={col.key}
              className={`bg-slate-100/80 rounded-2xl p-3 border-t-4 ${col.color} border-slate-200 min-h-[500px] flex flex-col`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  {col.title}
                </h3>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                  {colApps.length}
                </span>
              </div>

              {/* Cards inside column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colApps.length === 0 && (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs my-4">
                    No candidates in stage
                  </div>
                )}

                {colApps.map((app) => {
                  const isSelected = selectedApp?.id === app.id;

                  return (
                    <div
                      key={app.id}
                      onClick={() => {
                        setSelectedApp(app);
                        setInternalNote(app.internal_notes || '');
                      }}
                      className={`p-4 rounded-xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {app.candidate_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">{app.candidate_headline}</p>
                      <p className="text-[11px] font-semibold text-indigo-700 mt-1">
                        {app.job_title}
                      </p>

                      <div className="mt-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                            setDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                        >
                          <Eye size={12} />
                          <span>View Info & CV</span>
                        </button>
                      </div>

                      {/* Quick Move Action Triggers */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        {col.key === 'new' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeMoveStatus(app, 'reviewing');
                            }}
                            className="w-full text-center py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] rounded transition-colors"
                          >
                            → Move to Review
                          </button>
                        )}

                        {col.key === 'reviewing' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeMoveStatus(app, 'interview');
                            }}
                            className="w-full text-center py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-[11px] rounded transition-colors"
                          >
                            → Schedule Interview
                          </button>
                        )}

                        {col.key === 'interview' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeMoveStatus(app, 'offer');
                            }}
                            className="w-full text-center py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-[11px] rounded transition-colors"
                          >
                            → Extend Offer
                          </button>
                        )}

                        {col.key !== 'rejected' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingMove({ app, targetStatus: 'rejected' });
                              setConfirmModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Reject candidate"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CANDIDATE DETAIL DRAWER PANEL */}
      {selectedApp && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">{selectedApp.candidate_name}</h2>
                <StatusBadge status={selectedApp.status} size="md" />
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">{selectedApp.candidate_headline}</p>
              <p className="text-xs text-slate-400 mt-0.5">{selectedApp.candidate_email}</p>
            </div>

            {/* Quick Transition Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                Move Stage:
              </span>
              <button
                onClick={() => executeMoveStatus(selectedApp, 'reviewing')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Under Review
              </button>
              <button
                onClick={() => executeMoveStatus(selectedApp, 'interview')}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Interview
              </button>
              <button
                onClick={() => executeMoveStatus(selectedApp, 'offer')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Offer
              </button>
              <button
                onClick={() => {
                  setPendingMove({ app: selectedApp, targetStatus: 'rejected' });
                  setConfirmModalOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Reject / Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
            {/* Candidate Cover Note & Resume Document Preview */}
            <div className="space-y-6 text-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Attached Candidate Resume</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-indigo-600" />
                    <div>
                      <p className="font-bold text-slate-900">{selectedApp.resume_file_name}</p>
                      <p className="text-[10px] text-slate-500">PDF Document • Verifiable Attachment</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 font-bold text-[11px] rounded-lg">
                    PDF Attached
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Candidate Cover Note</h3>
                <p className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 italic leading-relaxed">
                  "{selectedApp.cover_note}"
                </p>
              </div>

              {/* Employer Internal Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Internal Employer Notes</h3>
                  <button
                    onClick={handleSaveInternalNote}
                    disabled={savingNote}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add private feedback from technical interviews, salary discussions, or manager panel notes..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-800"
                ></textarea>
              </div>
            </div>

            {/* Application Audit Log History */}
            <div className="text-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-1.5">
                <History size={16} className="text-indigo-600" /> Verifiable State Machine Audit Trail
              </h3>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {selectedApp.status_history.map((hist) => (
                  <div key={hist.id} className="relative pl-7">
                    <div className="absolute left-1.5 top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Moved to '{hist.to_status.toUpperCase()}'</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(hist.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{hist.note}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        Actor: {hist.updated_by_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DESTRUCTIVE / FORCED TRANSITION MODAL */}
      <ConfirmDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmForcedMove}
        title="Confirm Application State Machine Transition"
        message={`Are you sure you want to move ${pendingMove?.app.candidate_name}'s status to '${pendingMove?.targetStatus.toUpperCase()}'? This transition will be permanently recorded in the status audit log.`}
        confirmLabel="Execute Status Change"
        isDestructive={pendingMove?.targetStatus === 'rejected'}
      />

      {/* APPLICANT DETAIL & CV MODAL */}
      <ApplicantDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        application={selectedApp}
        onStatusChange={async (app, targetStatus) => {
          await executeMoveStatus(app, targetStatus, true);
        }}
        onRefresh={fetchData}
      />
    </div>
  );
};
