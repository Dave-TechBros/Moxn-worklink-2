import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './views/LandingPage';
import { AuthModal } from './components/AuthModal';
import { CandidateJobSearch } from './views/CandidateJobSearch';
import { CandidateJobDetail } from './views/CandidateJobDetail';
import { CandidateApplyModal } from './views/CandidateApplyModal';
import { CandidateApplicationsTracker } from './views/CandidateApplicationsTracker';
import { CandidateProfileManager } from './views/CandidateProfileManager';
import { EmployerDashboard } from './views/EmployerDashboard';
import { EmployerJobPosting } from './views/EmployerJobPosting';
import { EmployerKanbanPipeline } from './views/EmployerKanbanPipeline';
import { AdminConsole } from './views/admin/AdminConsole';
import { ReportModal } from './components/ReportModal';
import { Job } from './types';

function MainAppContent() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Active view tab state (defaults to 'landing' if no user)
  const [activeTab, setActiveTab] = useState<string>('landing');

  // Selected job for detail view or application modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Job to edit in employer form
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Selected job for pipeline view
  const [pipelineJobId, setPipelineJobId] = useState<string | undefined>(undefined);

  // Modal states
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register'>('signin');
  const [applyModalOpen, setApplyModalOpen] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportedJob, setReportedJob] = useState<Job | null>(null);

  // Update tab when user logs in/out
  useEffect(() => {
    if (!currentUser) {
      if (activeTab !== 'jobs' && activeTab !== 'job-detail') {
        setActiveTab('landing');
      }
    } else {
      if (activeTab === 'landing') {
        if (currentUser.role === 'employer') setActiveTab('employer-dashboard');
        else if (currentUser.role === 'admin') setActiveTab('admin-dashboard');
        else setActiveTab('jobs');
      }
    }
  }, [currentUser]);

  const handleOpenAuthModal = (mode: 'signin' | 'register' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setActiveTab('job-detail');
  };

  const handleOpenApplyModal = (job: Job) => {
    if (!currentUser) {
      showToast('Account Required', 'Please sign in or create an account to submit job applications.', 'info');
      handleOpenAuthModal('register');
      return;
    }
    setSelectedJob(job);
    setApplyModalOpen(true);
  };

  const handleOpenReportModal = (job: Job) => {
    if (!currentUser) {
      showToast('Account Required', 'Please sign in to report job listings.', 'info');
      handleOpenAuthModal('signin');
      return;
    }
    setReportedJob(job);
    setReportModalOpen(true);
  };

  const handleViewPipelineForJob = (jobId?: string) => {
    setPipelineJobId(jobId);
    setActiveTab('employer-pipeline');
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setActiveTab('employer-post-job');
  };

  const handleAuthSuccess = () => {
    if (currentUser?.role === 'employer') setActiveTab('employer-dashboard');
    else if (currentUser?.role === 'admin') setActiveTab('admin-dashboard');
    else setActiveTab('jobs');
  };

  // Admin console is a full-screen layout that replaces the public chrome.
  if ((activeTab === 'admin-dashboard' || activeTab === 'admin-companies') && currentUser?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
        <AdminConsole
          onExitAdmin={() => setActiveTab('landing')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuthModal}
      />

      {/* Main Content Router View */}
      <main className="flex-1">
        {/* LANDING PAGE VIEW */}
        {activeTab === 'landing' && (
          <LandingPage
            onOpenAuth={handleOpenAuthModal}
            onExploreJobs={() => setActiveTab('jobs')}
            onSelectJob={handleSelectJob}
          />
        )}

        {/* CANDIDATE VIEWS */}
        {activeTab === 'jobs' && (
          <CandidateJobSearch
            onSelectJob={handleSelectJob}
            onOpenReportModal={handleOpenReportModal}
          />
        )}

        {activeTab === 'job-detail' && selectedJob && (
          <CandidateJobDetail
            job={selectedJob}
            onBack={() => setActiveTab('jobs')}
            onOpenApplyModal={handleOpenApplyModal}
            onOpenReportModal={handleOpenReportModal}
            onGoToTracker={() => setActiveTab('applications')}
          />
        )}

        {activeTab === 'applications' && (
          <CandidateApplicationsTracker onBrowseJobs={() => setActiveTab('jobs')} />
        )}

        {activeTab === 'profile' && <CandidateProfileManager />}

        {/* EMPLOYER VIEWS */}
        {activeTab === 'employer-dashboard' && (
          <EmployerDashboard
            onPostJob={() => {
              setEditingJob(null);
              setActiveTab('employer-post-job');
            }}
            onViewPipeline={handleViewPipelineForJob}
            onEditJob={handleEditJob}
          />
        )}

        {activeTab === 'employer-post-job' && (
          <EmployerJobPosting
            jobToEdit={editingJob}
            onBack={() => setActiveTab('employer-dashboard')}
            onJobSaved={() => setActiveTab('employer-dashboard')}
          />
        )}

        {activeTab === 'employer-pipeline' && (
          <EmployerKanbanPipeline
            initialJobId={pipelineJobId}
            onBackToDashboard={() => setActiveTab('employer-dashboard')}
          />
        )}

        {/* ADMIN VIEWS (full-screen, rendered above) */}
        {(activeTab === 'admin-dashboard' || activeTab === 'admin-companies') && currentUser?.role !== 'admin' && (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <p className="text-sm font-semibold">You do not have access to the admin console.</p>
          </div>
        )}
      </main>

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Application 3-step Modal */}
      {selectedJob && (
        <CandidateApplyModal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          job={selectedJob}
          onApplicationSubmitted={() => setActiveTab('applications')}
        />
      )}

      {/* Report Listing Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        job={reportedJob}
      />

      {/* Footer */}
      <Footer onNavigate={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
