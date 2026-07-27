import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { MoxnLogo } from '../components/MoxnLogo';
import {
  Search,
  ShieldCheck,
  Users,
  FileCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  MapPin,
  DollarSign,
  Building2,
  CheckCircle2,
  Layers,
  Lock,
  UserCheck
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode?: 'signin' | 'register') => void;
  onExploreJobs: () => void;
  onSelectJob: (job: Job) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onExploreJobs,
  onSelectJob
}) => {
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const data: Job[] = await res.json();
          setFeaturedJobs(data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to fetch landing page jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white pt-16 pb-24 border-b border-slate-800">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-wide">
              <MoxnLogo size={16} className="text-indigo-400" />
              <span>Moxn Worklink — Verified Tech Career Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Direct Engineering Hiring. <br />
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
                Verifiable Resumes & Transparent Salaries.
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Moxn Worklink connects software candidates directly with verified hiring teams. Experience real-time application pipelines, salary transparency, and zero recruiter spam.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Create Free Account</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onOpenAuth('signin')}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={16} className="text-slate-400" />
                <span>Sign In to Account</span>
              </button>

              <button
                onClick={onExploreJobs}
                className="w-full sm:w-auto px-6 py-3.5 text-indigo-300 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search size={16} />
                <span>Browse Live Roles</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-800 text-center">
              <div>
                <p className="text-2xl font-black text-white">$160k - $320k</p>
                <p className="text-xs text-slate-400 font-medium">Verified Salary Ranges</p>
              </div>
              <div>
                <p className="text-2xl font-black text-indigo-400">100%</p>
                <p className="text-xs text-slate-400 font-medium">Verifiable PDF Resumes</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">5-Stage</p>
                <p className="text-xs text-slate-400 font-medium">Enforced Kanban Pipeline</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400">Zero</p>
                <p className="text-xs text-slate-400 font-medium">Spam / Ghost Postings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE USER PORTALS CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Every Role in Tech Recruitment
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Pick your entry point or create an account tailored to your career objectives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card 1: Candidates */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                For Software Engineers & Designers
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1 mb-3">
                Job Candidate Hub
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Build your professional profile, upload verifiable PDF resumes, and track application progress from initial submission to final offer extension.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Real-time status tracking audit logs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Transparent USD salary disclosures</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>One-click PDF resume uploads</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Get Started as Candidate
            </button>
          </div>

          {/* Card 2: Employers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Building2 size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                For Tech Hiring Managers
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1 mb-3">
                Employer Hiring Portal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Publish positions with enforced salary parameters, manage candidates across Kanban recruitment stages, and record internal interview feedback.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Interactive Kanban applicant stage board</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Internal hiring team notes & reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Enforced status transition validation</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Get Started as Employer
            </button>
          </div>
        </div>
      </section>

      {/* FEATURED LIVE OPENINGS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Featured Active Opportunities
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Explore live open roles with verified salary details across leading technology teams.
            </p>
          </div>

          <button
            onClick={onExploreJobs}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>View All Active Roles</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loadingJobs && (
          <div className="p-8 text-center text-slate-500 animate-pulse text-xs">
            Loading active positions...
          </div>
        )}

        {!loadingJobs && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={job.company_logo || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=250'}
                        alt={job.company_name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{job.title}</h4>
                        <p className="text-xs text-slate-500 font-medium">{job.company_name}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                      {job.location_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {job.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} /> {job.location}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <DollarSign size={13} className="-mr-1 text-emerald-600" />
                      ${Math.round(job.salary_min / 1000)}k - ${Math.round(job.salary_max / 1000)}k
                    </span>
                  </div>

                  <span className="text-indigo-600 hover:underline font-bold flex items-center gap-1">
                    View Position →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Ready to find your next engineering role or hire key talent?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Create an account on Moxn Worklink in under 30 seconds to access live listings and direct candidate application channels.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={() => onOpenAuth('register')}
                className="px-6 py-3 bg-white text-indigo-900 hover:bg-slate-100 font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Create Account Now
              </button>
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-6 py-3 bg-indigo-800/80 hover:bg-indigo-700/80 text-white font-bold text-xs rounded-xl border border-indigo-600 transition-colors cursor-pointer"
              >
                Sign In to Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
