import React, { useState, useEffect } from 'react';
import { Job, Application, ApplicationStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ApplicantDetailModal } from '../components/ApplicantDetailModal';
import {
  Briefcase,
  PlusCircle,
  Users,
  Eye,
  Edit,
  Power,
  Clock,
  MapPin,
  DollarSign,
  ChevronRight,
  Building2,
  Sparkles,
  RefreshCw,
  FileText,
  Download,
  Mail,
  UserCheck
} from 'lucide-react';

interface EmployerDashboardProps {
  onPostJob: () => void;
  onViewPipeline: (jobId?: string) => void;
  onEditJob: (job: Job) => void;
}

export const EmployerDashboard: React.FC<EmployerDashboardProps> = ({
  onPostJob,
  onViewPipeline,
  onEditJob
}) => {
  const { authFetch, currentCompany, currentUser } = useAuth();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'applicants'>('jobs');

  // Selected application for detail & CV modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  const fetchEmployerData = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        authFetch('/api/jobs?status=all'),
        authFetch('/api/employer/applications')
      ]);

      if (jobsRes.ok) {
        const allJobs: Job[] = await jobsRes.json();
        // Filter jobs owned by employer company
        const companyJobs = allJobs.filter(
          (j) => j.company_id === currentCompany?.id || currentUser?.role === 'admin'
        );
        setJobs(companyJobs);
      }

      if (appsRes.ok) {
        const allApps: Application[] = await appsRes.json();
        setApplications(allApps);
      }
    } catch (err) {
      console.error('Failed to load employer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployerData();
  }, [currentCompany?.id, currentUser?.id]);

  const toggleJobStatus = async (job: Job, newStatus: 'published' | 'closed' | 'draft') => {
    try {
      const res = await authFetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update job status');

      showToast(
        'Listing Updated',
        `Job '${job.title}' status changed to '${newStatus}'.`,
        'success'
      );
      fetchEmployerData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleStatusChange = async (
    app: Application,
    targetStatus: ApplicationStatus,
    force: boolean = true
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
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      showToast(
        'Pipeline Stage Updated',
        `Moved candidate ${app.candidate_name} to '${targetStatus.toUpperCase()}'.`,
        'success'
      );

      // Refresh local data
      fetchEmployerData();
      if (selectedApp?.id === app.id) {
        setSelectedApp(data.application);
      }
    } catch (err: any) {
      showToast('Transition Failed', err.message, 'error');
    }
  };

  const activeCount = jobs.filter((j) => j.status === 'published').length;
  const draftCount = jobs.filter((j) => j.status === 'draft').length;
  const closedCount = jobs.filter((j) => j.status === 'closed').length;
  const totalApplicants = applications.length || jobs.reduce((sum, j) => sum + (j.applicant_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="text-indigo-600" size={18} />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {currentCompany?.name || 'Company'} Employer Workspace
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Employer Dashboard
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Publish open positions, review applicant profiles, view attached CVs, and manage hiring pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchEmployerData()}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh dashboard data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => onViewPipeline()}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Users size={16} />
            <span>Kanban Pipeline</span>
          </button>

          <button
            onClick={onPostJob}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-200"
          >
            <PlusCircle size={16} />
            <span>Post New Position</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Published
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Applicants
          </p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{totalApplicants}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Draft Listings
          </p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{draftCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Closed Positions
          </p>
          <p className="text-3xl font-extrabold text-slate-400 mt-1">{closedCount}</p>
        </div>
      </div>

      {/* Main Content Tabs (Open Positions vs. Applicants) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'jobs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase size={16} />
            <span>Open Job Positions ({jobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applicants')}
            className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'applicants'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            <span>Applicant Profiles & CVs ({applications.length})</span>
          </button>
        </div>

        {loading && (
          <div className="p-8 text-center text-slate-500 animate-pulse">
            Loading dashboard data...
          </div>
        )}

        {/* TAB 1: POSITIONS LIST */}
        {!loading && activeTab === 'jobs' && (
          <div>
            {jobs.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-800">No job positions created yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Publish a new position to start receiving candidate applications.
                </p>
                <button
                  onClick={onPostJob}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                >
                  Create Job Position
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <div key={job.id} className="p-6 hover:bg-slate-50/80 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              job.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : job.status === 'draft'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {job.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {job.location_type} • {job.employment_type}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin size={13} /> {job.location}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <DollarSign size={13} className="-mr-1 text-emerald-600" />
                            ${Math.round(job.salary_min / 1000)}k - ${Math.round(job.salary_max / 1000)}k
                          </span>
                          <span className="flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                            <Users size={13} /> {job.applicant_count || 0} Applicants
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewPipeline(job.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Users size={14} />
                          <span>Review Applicants ({job.applicant_count || 0})</span>
                        </button>

                        <button
                          onClick={() => onEditJob(job)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="Edit position"
                        >
                          <Edit size={16} />
                        </button>

                        {job.status === 'published' ? (
                          <button
                            onClick={() => toggleJobStatus(job, 'closed')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Close position"
                          >
                            <Power size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleJobStatus(job, 'published')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                            title="Publish position"
                          >
                            <Power size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APPLICANTS & CV SUBMISSIONS LIST */}
        {!loading && activeTab === 'applicants' && (
          <div>
            {applications.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-800">No candidate applications received yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Applications submitted by candidates will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="p-6 hover:bg-slate-50/80 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                          {app.candidate_name.charAt(0)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-slate-900 text-base">{app.candidate_name}</h3>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                app.status === 'new'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : app.status === 'reviewing'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : app.status === 'interview'
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : app.status === 'offer'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              STAGE: {app.status.toUpperCase()}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-600">{app.candidate_headline}</p>

                          <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1 font-medium flex-wrap">
                            <span className="text-indigo-700 font-bold">Applied for: {app.job_title}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {app.candidate_email}
                            </span>
                            <span>•</span>
                            <span>Date: {new Date(app.created_at).toLocaleDateString()}</span>
                          </div>

                          <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 max-w-xl">
                            <FileText size={16} className="text-indigo-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {app.resume_file_name || 'Resume_Document.pdf'}
                            </span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold ml-auto shrink-0">
                              PDF Attached
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setDetailModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Eye size={15} />
                          <span>View Info & CV</span>
                        </button>

                        <button
                          onClick={() => onViewPipeline(app.job_id)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users size={15} />
                          <span>Pipeline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* APPLICANT DETAIL & CV MODAL */}
      <ApplicantDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        application={selectedApp}
        onStatusChange={handleStatusChange}
        onRefresh={fetchEmployerData}
      />
    </div>
  );
};
