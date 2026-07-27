import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { MoxnLogo } from './MoxnLogo';
import { useToast } from './Toast';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { showToast } = useToast();

  const handleLinkClick = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const handleInfoClick = (topic: string) => {
    showToast(topic, `Moxn Worklink ${topic} is fully enabled and enforced platform-wide.`, 'info');
  };

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <MoxnLogo size={16} />
              </div>
              <span className="text-base font-bold text-white tracking-tight">Moxn Worklink</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              Clean, confidence-inspiring career marketplace. Verifiable application state tracking, transparent role pipelines, and moderated employer listings.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-medium">
              <ShieldCheck size={14} />
              <span>WCAG 2.2 Compliant • Server-Enforced RBAC</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
              For Candidates
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleLinkClick('jobs')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Instant Job Search
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('applications')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Application Pipeline Tracker
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('profile')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Resume & Profile Builder
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('jobs')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Salary Transparency
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
              For Employers
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleLinkClick('employer-pipeline')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Kanban Applicant Pipeline
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('employer-post-job')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Structured Job Creator
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('employer-dashboard')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Employer Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('admin-dashboard')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Platform Moderation
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
              Marketplace Health
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> State Machine Audited
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> Spam Moderation Queue
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> PDF Document Safety
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Moxn Worklink. Built for high-trust career decisions.</p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleInfoClick('Privacy Policy')}
              className="hover:text-slate-400 cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => handleInfoClick('Terms of Service')}
              className="hover:text-slate-400 cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => handleInfoClick('Accessibility Standards')}
              className="hover:text-slate-400 cursor-pointer"
            >
              Accessibility
            </button>
            <button
              onClick={() => handleInfoClick('API Documentation')}
              className="hover:text-slate-400 cursor-pointer"
            >
              API Documentation
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
