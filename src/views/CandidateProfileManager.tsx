import React, { useState, useEffect, useRef } from 'react';
import { CandidateProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  User,
  FileText,
  Upload,
  Plus,
  X,
  Check,
  Save,
  Globe,
  MapPin,
  Sparkles,
  Eye,
  FileCheck
} from 'lucide-react';

export const CandidateProfileManager: React.FC = () => {
  const { authFetch, currentUser, currentProfile, refreshAuthData, applyAuthData } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>(currentUser?.avatar || undefined);
  const [headline, setHeadline] = useState(currentProfile?.headline || '');
  const [location, setLocation] = useState(currentProfile?.location || '');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [skills, setSkills] = useState<string[]>(currentProfile?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [links, setLinks] = useState<{ label: string; url: string }[]>(
    currentProfile?.links || []
  );
  const [resumeFileName, setResumeFileName] = useState(
    currentProfile?.resume_file_name || ''
  );
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setAvatar(currentUser.avatar || undefined);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentProfile) {
      setHeadline(currentProfile.headline || '');
      setLocation(currentProfile.location || '');
      setBio(currentProfile.bio || '');
      setSkills(currentProfile.skills || []);
      setLinks(currentProfile.links || []);
      setResumeFileName(currentProfile.resume_file_name || '');
    }
  }, [currentProfile]);

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Upload Error', 'Please select a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setAvatar(dataUrl);

        const res = await authFetch('/api/candidate/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: dataUrl })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user || data.profile) {
            applyAuthData({ user: data.user, profile: data.profile });
          } else {
            await refreshAuthData();
          }
          showToast('Profile Picture Updated', 'Your new profile picture has been saved.', 'success');
        } else {
          throw new Error('Failed to save profile picture');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to upload profile picture', 'error');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatar(undefined);
      const res = await authFetch('/api/candidate/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user || data.profile) {
          applyAuthData({ user: data.user, profile: data.profile });
        } else {
          await refreshAuthData();
        }
        showToast('Profile Picture Removed', 'Your profile picture has been removed.', 'success');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (s: string) => {
    setSkills(skills.filter((sk) => sk !== s));
  };

  const handleAddLink = () => {
    if (newLinkLabel.trim() && newLinkUrl.trim()) {
      setLinks([...links, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
      setNewLinkLabel('');
      setNewLinkUrl('');
    }
  };

  const handleRemoveLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      showToast('Upload Error', 'Only PDF files are supported for candidate resumes.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Upload Error', 'File size exceeds 10MB limit. Please upload a smaller PDF.', 'error');
      return;
    }

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
          let message = 'Failed to upload resume document';
          try {
            const errData = await res.json();
            if (errData.error) message = errData.error;
          } catch {
            // ignore parse errors, keep default message
          }
          throw new Error(message);
        }

        const doc = await res.json();
        setResumeFileName(doc.filename);
        await refreshAuthData();
        if (resumeInputRef.current) resumeInputRef.current.value = '';
        showToast('Resume Updated', `${file.name} saved to your profile.`, 'success');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to process PDF upload', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/candidate/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          location,
          bio,
          skills,
          links
        })
      });

      if (!res.ok) throw new Error('Failed to save profile');

      const updatedProfile = await res.json();
      applyAuthData({ profile: updatedProfile });
      showToast('Profile Saved', 'Your candidate profile has been updated.', 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Profile & Resume Management
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Build a comprehensive candidate profile visible to hiring managers during application reviews.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Basic Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 pb-6 border-b border-slate-100">
            {/* Avatar image or initial badge */}
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={currentUser?.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center ring-4 ring-indigo-50 shadow-sm">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{currentUser?.name}</h2>
                <p className="text-xs text-slate-500 font-medium">{currentUser?.email}</p>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <label className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors flex items-center gap-1.5">
                  <Upload size={14} />
                  <span>{avatar ? 'Change Profile Picture' : 'Upload Profile Picture'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleAvatarUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {avatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Remove Picture</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., Senior Staff Frontend Engineer | React & TypeScript"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Primary Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA (Hybrid / Remote)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-3">About & Experience Summary</h3>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a concise executive summary of your engineering background, domain specialization, and impact..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-800"
          ></textarea>
        </div>

        {/* Skills Tag Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-slate-900">Skills & Technologies</h3>
            <span className="text-xs text-slate-500 font-medium">
              {skills.length === 0 ? 'No skills added yet' : `${skills.length} skills listed`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Add skills and technology tools you specialize in. Hiring managers search for these when reviewing candidate applications.
          </p>

          {skills.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs font-medium mb-4">
              Your profile currently has no skills listed. Use the input field below to add skills yourself.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200/80"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-indigo-400 hover:text-indigo-900 p-0.5 rounded cursor-pointer transition-colors"
                    title="Remove skill"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
              placeholder="Add skill (e.g., React, Go, Docker)"
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddSkill}
              className="px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Add Skill</span>
            </button>
          </div>
        </div>

        {/* Portfolio & Social Links */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-3">Professional Links</h3>

          <div className="space-y-2 mb-4">
            {links.map((link, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-indigo-600" />
                  <span className="font-bold text-slate-900">{link.label}:</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {link.url}
                  </a>
                </div>
                <button
                  onClick={() => handleRemoveLink(idx)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="Label (e.g. GitHub)"
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="URL (https://...)"
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <button
              onClick={handleAddLink}
              className="py-2 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Add Link
            </button>
          </div>
        </div>

        {/* Resume PDF File Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-2">Resume PDF Document</h3>
          <p className="text-xs text-slate-500 mb-4">
            This PDF resume is automatically attached whenever you submit job applications.
          </p>

          <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                <FileCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {resumeFileName || 'No resume uploaded yet'}
                </p>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">Verified PDF Document</p>
              </div>
            </div>

            <label className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors">
              Replace PDF
              <input
                type="file"
                accept="application/pdf"
                ref={resumeInputRef}
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
      </div>
    </div>
  );
};
