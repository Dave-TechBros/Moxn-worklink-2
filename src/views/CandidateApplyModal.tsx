import React, { useState } from 'react';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import {
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  AlertCircle,
  FileCheck,
  Sparkles
} from 'lucide-react';

interface CandidateApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onApplicationSubmitted: () => void;
}

export const CandidateApplyModal: React.FC<CandidateApplyModalProps> = ({
  isOpen,
  onClose,
  job,
  onApplicationSubmitted
}) => {
  const { authFetch, currentUser, currentProfile, refreshAuthData } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [coverNote, setCoverNote] = useState<string>(
    'I am excited to apply for this position. My background in software architecture and design matches the key requirements outlined.'
  );

  // Resume Upload / Selection State
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    currentProfile?.resume_file_id || ''
  );
  const [selectedResumeName, setSelectedResumeName] = useState<string>(
    currentProfile?.resume_file_name || ''
  );
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resume Upload Handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMessage('Only PDF documents are accepted for candidate resumes.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit. Please upload a smaller PDF.');
      return;
    }

    setErrorMessage(null);
    setUploadingResume(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        const res = await authFetch('/api/candidate/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            dataUrl
          })
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error(
              'Your session could not be verified by the server. Please sign in again and retry.'
            );
          }
          throw new Error('Failed to upload resume document');
        }

        const newDoc = await res.json();
        setSelectedResumeId(newDoc.id);
        setSelectedResumeName(newDoc.filename);
        await refreshAuthData();
        showToast('Resume Uploaded', `${file.name} saved successfully.`, 'success');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing resume upload.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmitApplication = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await authFetch('/api/candidate/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          resume_file_id: selectedResumeId,
          cover_note: coverNote
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            'Your session could not be verified by the server. Please sign in again and retry — if this persists, the platform database is not connected.'
          );
        }
        throw new Error(data.error || 'Failed to submit application');
      }

      showToast(
        'Application Submitted!',
        `Your application for ${job.title} at ${job.company_name} is now live in status 'New'.`,
        'success'
      );

      onApplicationSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please try again.');
      showToast('Submission Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      {/* Step Indicator Header (Chunked per Miller's Law) */}
      <div className="mb-6 pr-10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span className="min-w-0 truncate">Apply to {job.company_name}</span>
          <span className="whitespace-nowrap">Step {step} of 3</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div
            className={`h-2 rounded-full transition-colors ${
              step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          ></div>
          <div
            className={`h-2 rounded-full transition-colors ${
              step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          ></div>
          <div
            className={`h-2 rounded-full transition-colors ${
              step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          ></div>
        </div>
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: CANDIDATE PROFILE CONFIRMATION */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Confirm Candidate Profile</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify your information as it will appear to hiring managers at {job.company_name}.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                alt={currentUser?.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{currentUser?.name}</h4>
                <p className="text-xs text-slate-500">{currentUser?.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-500">Professional Headline:</span>
                <p className="font-medium text-slate-900 mt-0.5">
                  {currentProfile?.headline || 'Not set — update your profile'}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-500">Location:</span>
                <p className="font-medium text-slate-900 mt-0.5">
                  {currentProfile?.location || 'Not set — update your profile'}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-500">Skills Highlight:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentProfile?.skills && currentProfile.skills.length > 0 ? (
                    currentProfile.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 text-[11px] font-medium"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">No skills listed yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Next: Attach Resume & Cover Note</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RESUME ATTACHMENT & COVER NOTE */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Resume & Cover Note</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select or upload a PDF resume and share key highlights with the hiring lead.
            </p>
          </div>

          {/* Resume Upload Drag & Drop Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Attached Resume Document (PDF)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              <FileCheck className="mx-auto text-indigo-600 mb-2" size={32} />
              <p className="text-sm font-semibold text-slate-800">
                {selectedResumeName ? selectedResumeName : 'Drag and drop your PDF resume here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF format, max 10MB</p>

              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer">
                <Upload size={14} />
                <span>{uploadingResume ? 'Uploading...' : 'Choose PDF File'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Cover Note Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Cover Note for Hiring Team
            </label>
            <textarea
              rows={4}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Highlight why you are a great fit for this specific position..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
            ></textarea>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => {
                if (!selectedResumeId) {
                  setErrorMessage('Please attach or upload a resume PDF before proceeding.');
                  return;
                }
                setErrorMessage(null);
                setStep(3);
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Review Application</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FINAL REVIEW & SUBMIT */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Review & Final Submission</h3>
            <p className="text-xs text-slate-500 mt-1">
              Check all submission details before transmitting your application to {job.company_name}.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Applying For Position
              </span>
              <p className="text-sm font-bold text-slate-900">{job.title}</p>
              <p className="text-slate-600">{job.company_name} • {job.location}</p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Candidate Name & Contact
              </span>
              <p className="font-semibold text-slate-900">{currentUser?.name}</p>
              <p className="text-slate-600">{currentUser?.email}</p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Attached Resume File
              </span>
              <p className="font-semibold text-indigo-700 flex items-center gap-1">
                <FileText size={14} /> {selectedResumeName}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Cover Note
              </span>
              <p className="text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                "{coverNote}"
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleSubmitApplication}
              disabled={submitting}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>{submitting ? 'Transmitting...' : 'Submit Application Now'}</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
