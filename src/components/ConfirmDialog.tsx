import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer ${
            isDestructive
              ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
