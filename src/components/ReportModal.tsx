import React, { useState } from 'react';
import { Job } from '../types';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { ShieldAlert, AlertCircle } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, job }) => {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [reason, setReason] = useState('Spam & Financial Scam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!job) return null;

  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      const res = await authFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'job',
          target_id: job.id,
          target_title: `${job.title} at ${job.company_name}`,
          reason,
          details
        })
      });

      if (!res.ok) throw new Error('Failed to transmit flag report');

      showToast(
        'Report Transmitted',
        'Thank you. Platform moderators have queued this listing for review.',
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Report Inappropriate Listing</h3>
            <p className="text-xs text-slate-500">
              Flagging: <span className="font-semibold text-slate-800">{job.title}</span> ({job.company_name})
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Reason for Reporting
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500"
          >
            <option value="Spam & Financial Scam">Spam & Financial Scam</option>
            <option value="Misleading Salary or Location">Misleading Salary or Location</option>
            <option value="Unverified / Fraudulent Company">Unverified / Fraudulent Company</option>
            <option value="Discrimination / Offensive Content">Discrimination / Offensive Content</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Additional Context or Evidence
          </label>
          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what makes this listing suspicious or inaccurate..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
          ></textarea>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitReport}
            disabled={submitting}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {submitting ? 'Transmitting...' : 'Submit Flag Report'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
