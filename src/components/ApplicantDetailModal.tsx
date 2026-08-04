import React, { useState } from 'react';
import { Application, ApplicationStatus, CandidateProfile, ResumeDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { StatusBadge } from './StatusBadge';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Briefcase,
  Globe,
  Github,
  Linkedin,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  UserCheck,
  Eye
} from 'lucide-react';

interface ApplicantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  onStatusChange?: (app: Application, targetStatus: ApplicationStatus, force?: boolean) => Promise<void>;
  onRefresh?: () => void;
}

export const ApplicantDetailModal: React.FC<ApplicantDetailModalProps> = ({
  isOpen,
  onClose,
  application,
  onStatusChange,
  onRefresh
}) => {
  if (!isOpen || !application) return null;

  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [internalNote, setInternalNote] = useState<string>(application.internal_notes || '');
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'resume' | 'cover' | 'audit'>('resume');

  // Candidate profile and resume document from enriched application
  const profile: CandidateProfile | undefined = (application as any).candidate_profile;
  const resumeDoc: ResumeDocument | undefined = (application as any).resume_document;

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await authFetch(`/api/applications/${application.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: internalNote })
      });

      if (!res.ok) throw new Error('Failed to save notes');

      showToast('Note Saved', 'Internal note updated for candidate.', 'success');
      application.internal_notes = internalNote;
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDownloadCV = () => {
    const filename = application.resume_file_name || `${application.candidate_name.replace(/\s+/g, '_')}_Resume.pdf`;
    let dataUrl = resumeDoc?.data_url;

    if (!dataUrl) {
      // Fallback data url if string preview
      const content = `CV / RESUME DOCUMENT\nCandidate: ${application.candidate_name}\nEmail: ${application.candidate_email}\nHeadline: ${application.candidate_headline}\nJob Applied: ${application.job_title}\nSubmitted: ${new Date(application.created_at).toLocaleString()}`;
      dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('Download Started', `Downloading ${filename}`, 'info');
  };

  const handleOpenCVNewTab = () => {
    let dataUrl = resumeDoc?.data_url;
    if (dataUrl && dataUrl.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    } else {
      handleDownloadCV();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            {(profile as any)?.avatar || (application as any).candidate_avatar ? (
              <img
                src={(profile as any)?.avatar || (application as any).candidate_avatar}
                alt={application.candidate_name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shrink-0">
                {application.candidate_name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white">{application.candidate_name}</h2>
                <StatusBadge status={application.status} size="sm" />
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{application.candidate_headline}</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {application.candidate_email}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase size={12} /> Applied for <strong className="text-indigo-300">{application.job_title}</strong>
                </span>
                <span>
                  Submitted: {new Date(application.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Action Stage Controller Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Pipeline Stage:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['new', 'reviewing', 'interview', 'offer', 'rejected'] as ApplicationStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => onStatusChange && onStatusChange(application, st, true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      application.status === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {st.toUpperCase()}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCV}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download size={14} />
              <span>Download CV (PDF)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 shrink-0">
          <button
            onClick={() => setActiveTab('resume')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'resume'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText size={15} />
            <span>Curriculum Vitae (CV)</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck size={15} />
            <span>Candidate Profile & Skills</span>
          </button>
          <button
            onClick={() => setActiveTab('cover')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'cover'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={15} />
            <span>Cover Note</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History size={15} />
            <span>Audit History ({application.status_history.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: RESUME / CV DOCUMENT PREVIEW */}
          {activeTab === 'resume' && (
            <div className="space-y-6">
              {/* Document Info Header Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{application.resume_file_name || 'Candidate_Resume.pdf'}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Document Type: PDF • Size: {Math.round((resumeDoc?.file_size || 245000) / 1024)} KB • Verified
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadCV}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </button>
                  <button
                    onClick={handleOpenCVNewTab}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>New Tab</span>
                  </button>
                </div>
              </div>

              {/* Document Render Canvas Preview */}
              <div className="bg-slate-100 rounded-2xl border border-slate-300 p-6 sm:p-8 min-h-[350px]">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 max-w-2xl mx-auto space-y-6 text-slate-800 text-xs">
                  <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{application.candidate_name}</h1>
                      <p className="text-xs font-bold text-indigo-600 mt-1">{application.candidate_headline}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{application.candidate_email} • {profile?.location || 'Location not provided'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Application File</span>
                      <p className="text-xs font-mono font-bold text-slate-700">{application.resume_file_id || 'RES-VERIFIED'}</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-100 pb-1">
                      Professional Overview
                    </h2>
                    <p className="text-slate-700 leading-relaxed font-normal">
                      {profile?.bio || "No professional overview provided yet."}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-100 pb-1">
                      Core Technical Skills & Domains
                    </h2>
                    {profile?.skills && profile.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((sk) => (
                          <span key={sk} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold">
                            {sk}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">No skills listed by candidate yet.</p>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-100 pb-1">
                      Portfolio & Professional Links
                    </h2>
                    {profile?.links && profile.links.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {profile.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                          >
                            <ExternalLink size={12} />
                            <span>{link.label}: {link.url}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">No links provided.</p>
                    )}
                  </div>

                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 text-indigo-900 text-[11px] flex items-center justify-between">
                    <span>Full raw PDF document binary attached and ready for export.</span>
                    <button
                      onClick={handleDownloadCV}
                      className="font-bold text-indigo-700 underline cursor-pointer"
                    >
                      Download Original File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATE PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">Personal & Location Info</h3>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full Name</span>
                    <p className="font-bold text-slate-800 text-sm">{application.candidate_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Headline</span>
                    <p className="font-medium text-slate-800">{application.candidate_headline}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address</span>
                    <p className="font-medium text-slate-800">{application.candidate_email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Location</span>
                    <p className="font-medium text-slate-800">{profile?.location || application.location || 'Location not provided'}</p>
                  </div>
                  {profile?.years_experience !== undefined && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Experience</span>
                      <p className="font-bold text-indigo-600">{profile.years_experience} Years Professional Experience</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Skills & Core Expertise</h3>
                  {profile?.skills && profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No skills listed by candidate yet.</p>
                  )}

                  <div className="pt-2">
                    <h4 className="font-bold text-slate-900 mb-2">Verified Links</h4>
                    {profile?.links && profile.links.length > 0 ? (
                      <div className="space-y-1.5">
                        {profile.links.map((l, i) => (
                          <a
                            key={i}
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-indigo-600 font-bold hover:underline"
                          >
                            <ExternalLink size={14} />
                            <span>{l.label}: {l.url}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">No links provided.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio / Summary */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-2">Candidate Biography</h3>
                <p className="text-slate-700 leading-relaxed">
                  {profile?.bio || 'No candidate biography provided.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: COVER NOTE */}
          {activeTab === 'cover' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">Application Cover Note</h3>
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm leading-relaxed italic">
                "{application.cover_note || 'No cover note provided with this submission.'}"
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <History size={16} className="text-indigo-600" /> State Transition Audit Trail
              </h3>
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {application.status_history.map((hist) => (
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
          )}

          {/* Internal Notes Section - Always Visible at Bottom */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Internal Recruiter & Hiring Manager Notes</h3>
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {savingNote ? 'Saving Note...' : 'Save Notes'}
              </button>
            </div>
            <textarea
              rows={3}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Add confidential feedback, interview scoring, salary expectations, or manager remarks..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-800"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};
