import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Plus,
  X,
  Building2,
  Save,
  Sparkles,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface EmployerJobPostingProps {
  jobToEdit?: Job | null;
  onBack: () => void;
  onJobSaved: () => void;
}

export const EmployerJobPosting: React.FC<EmployerJobPostingProps> = ({
  jobToEdit,
  onBack,
  onJobSaved
}) => {
  const { authFetch, currentCompany } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(jobToEdit?.title || '');
  const [location, setLocation] = useState(jobToEdit?.location || 'San Francisco, CA');
  const [locationType, setLocationType] = useState<string>(
    jobToEdit?.location_type || 'Hybrid'
  );
  const [employmentType, setEmploymentType] = useState<string>(
    jobToEdit?.employment_type || 'Full-time'
  );
  const [salaryMin, setSalaryMin] = useState<number>(jobToEdit?.salary_min || 160000);
  const [salaryMax, setSalaryMax] = useState<number>(jobToEdit?.salary_max || 210000);
  const [description, setDescription] = useState(
    jobToEdit?.description ||
      `We are looking for a key engineering lead to join our platform team. You will drive system design, performance profiling, and mentor team members.`
  );
  const [requirements, setRequirements] = useState<string[]>(
    jobToEdit?.requirements || [
      '5+ years experience building production scalable web software',
      'Strong knowledge of TypeScript, React, and Node.js',
      'Familiarity with distributed data models and CI/CD'
    ]
  );
  const [newRequirement, setNewRequirement] = useState('');
  const [tags, setTags] = useState<string[]>(
    jobToEdit?.tags || ['React', 'TypeScript', 'Node.js']
  );
  const [newTag, setNewTag] = useState('');

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      setRequirements([...requirements, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleSave = async (status: 'published' | 'draft') => {
    if (!title.trim() || !description.trim()) {
      showToast('Validation Error', 'Title and description are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        requirements,
        location,
        location_type: locationType,
        employment_type: employmentType,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: 'USD',
        tags,
        status
      };

      let res;
      if (jobToEdit) {
        res = await authFetch(`/api/jobs/${jobToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await authFetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save job position');
      }

      showToast(
        'Job Saved',
        `Position '${title}' saved in status '${status}'.`,
        'success'
      );
      onJobSaved();
    } catch (err: any) {
      showToast('Save Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>Back to Employer Dashboard</span>
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            {currentCompany?.name || 'TechFlow Systems'} • Role Builder
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {jobToEdit ? 'Edit Position Listing' : 'Post New Open Position'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} />
            <span>{jobToEdit ? 'Update & Publish' : 'Publish Position'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Position Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Staff Frontend Architect"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State (or Remote)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Location Setup
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Salary Range Minimum ($ USD)
              </label>
              <input
                type="number"
                step={5000}
                value={salaryMin}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Salary Range Maximum ($ USD)
              </label>
              <input
                type="number"
                step={5000}
                value={salaryMax}
                onChange={(e) => setSalaryMax(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Description & Responsibilities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Detailed Role Overview & Responsibilities *
          </label>
          <textarea
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 text-slate-800 font-normal"
          ></textarea>
        </div>

        {/* Requirements Builder */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Specific Requirements List
          </label>

          <div className="space-y-2 mb-4">
            {requirements.map((req, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <span className="font-medium text-slate-800">• {req}</span>
                <button
                  onClick={() => handleRemoveRequirement(i)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRequirement()}
              placeholder="Add requirement bullet..."
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddRequirement}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Skill & Domain Tags
          </label>

          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200"
              >
                <span>{tag}</span>
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-600">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag (e.g. Go, AWS)"
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Add Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
