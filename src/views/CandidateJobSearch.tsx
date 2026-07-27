import React, { useState, useEffect, useTransition } from 'react';
import { Job, JobFilters } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Filter,
  X,
  Sparkles,
  Building2,
  Clock,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Check
} from 'lucide-react';

interface CandidateJobSearchProps {
  onSelectJob: (job: Job) => void;
  onOpenReportModal: (job: Job) => void;
}

export const CandidateJobSearch: React.FC<CandidateJobSearchProps> = ({
  onSelectJob,
  onOpenReportModal
}) => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter State
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    location: '',
    employment_type: 'All',
    location_type: 'All',
    salary_min: 80000,
    tags: []
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.location) query.set('location', filters.location);
      if (filters.employment_type && filters.employment_type !== 'All')
        query.set('employment_type', filters.employment_type);
      if (filters.location_type && filters.location_type !== 'All')
        query.set('location_type', filters.location_type);
      if (filters.salary_min > 0) query.set('salary_min', filters.salary_min.toString());
      filters.tags.forEach((t) => query.append('tags', t));

      const res = await authFetch(`/api/jobs?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to load listings');
      const data = await res.json();
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading roles.');
      showToast('Error', 'Could not retrieve job listings. Please retry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Instant response with debounced transition
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        fetchJobs();
      });
    }, 150);

    return () => clearTimeout(handler);
  }, [filters]);

  const availableTags = [
    'React',
    'TypeScript',
    'Go',
    'Python',
    'Product Design',
    'Distributed Systems',
    'Security',
    'Kubernetes'
  ];

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      location: '',
      employment_type: 'All',
      location_type: 'All',
      salary_min: 0,
      tags: []
    });
  };

  const formatSalary = (min: number, max: number) => {
    return `$${Math.round(min / 1000)}k - $${Math.round(max / 1000)}k`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Discover Open Positions
        </h1>
        <p className="text-slate-600 text-sm mt-1.5 max-w-2xl">
          Verified roles from top engineering and technology companies. Real-time application tracking with transparent salary ranges.
        </p>
      </div>

      {/* Main Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search job title, skills, keywords, or company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Location Filter */}
          <div className="md:col-span-3 relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="City, region, or Remote"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Location Type Selector */}
          <div className="md:col-span-2">
            <select
              value={filters.location_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, location_type: e.target.value }))}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="All">All Setup (Remote/Hybrid)</option>
              <option value="Remote">Remote Only</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {(filters.tags.length > 0 || filters.salary_min > 0 || filters.employment_type !== 'All') && (
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Tag Pill Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter size={12} /> Popular Skills:
          </span>
          {availableTags.map((tag) => {
            const isSelected = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isSelected && <Check size={12} className="inline mr-1 -mt-0.5" />}
                {tag}
              </button>
            );
          })}

          {(filters.tags.length > 0 || filters.search || filters.location || filters.employment_type !== 'All') && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose-600 font-semibold hover:underline ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {mobileFilterOpen && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employment Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Employment Type
            </label>
            <div className="space-y-1.5">
              {['All', 'Full-time', 'Part-time', 'Contract', 'Internship'].map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="emp_type"
                    checked={filters.employment_type === type}
                    onChange={() => setFilters((prev) => ({ ...prev, employment_type: type }))}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Salary Min Range Slider */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Minimum Salary Target (${Math.round(filters.salary_min / 1000)}k/year)
            </label>
            <input
              type="range"
              min={50000}
              max={250000}
              step={10000}
              value={filters.salary_min}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, salary_min: Number(e.target.value) }))
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>$50k</span>
              <span>$150k</span>
              <span>$250k+</span>
            </div>
          </div>

          {/* Active Filter Summary */}
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Filter Status
              </p>
              <p className="text-xs text-slate-600">
                Showing roles matching {jobs.length} verified listings.
              </p>
            </div>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="mt-4 py-2 px-4 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done Filtering
            </button>
          </div>
        </div>
      )}

      {/* Results Count & Response Time Indicator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-sm font-semibold text-slate-700">
          Showing <span className="text-indigo-600">{jobs.length}</span> open position{jobs.length === 1 ? '' : 's'}
        </p>
        <span className="text-xs text-slate-400 font-mono">Instant filter response &lt;150ms</span>
      </div>

      {/* LOADING SKELETON STATE */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
                  <div className="space-y-2">
                    <div className="h-5 w-64 bg-slate-200 rounded"></div>
                    <div className="h-4 w-40 bg-slate-100 rounded"></div>
                  </div>
                </div>
                <div className="h-8 w-24 bg-slate-200 rounded-xl"></div>
              </div>
              <div className="mt-4 h-12 w-full bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <ShieldAlert className="mx-auto text-rose-500 mb-2" size={32} />
          <h3 className="text-lg font-bold text-rose-900">Unable to load job listings</h3>
          <p className="text-sm text-rose-700 mt-1 mb-4">{error}</p>
          <button
            onClick={fetchJobs}
            className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && jobs.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching roles found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            We couldn't find any positions matching your specific filter criteria. Try adjusting your search keywords or minimum salary range.
          </p>
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* LISTINGS CARD GRID */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-6 group relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Company Logo & Details */}
                <div className="flex items-start gap-4">
                  <img
                    src={job.company_logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150'}
                    alt={job.company_name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">
                        {job.company_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {job.location_type}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-0.5">
                      {job.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={14} className="text-slate-400" />
                        {job.employment_type}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                        <DollarSign size={13} className="text-emerald-600 -mr-1" />
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary CTA Button (Fitts's Law large & clear) */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                  <button
                    onClick={() => onSelectJob(job)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View Role</span>
                    <ChevronRight size={16} />
                  </button>

                  <button
                    onClick={() => onOpenReportModal(job)}
                    className="text-slate-400 hover:text-rose-600 text-xs font-medium flex items-center gap-1 px-2 py-1 rounded transition-colors"
                    title="Report listing if inappropriate or spam"
                  >
                    <ShieldAlert size={12} />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              {/* Requirement Snippet & Tag Chips */}
              <p className="text-xs text-slate-600 mt-4 line-clamp-2 leading-relaxed">
                {job.description.replace(/###/g, '').replace(/[\*\-]/g, '•')}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                  <Clock size={12} /> Posted {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
