import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Application, Conversation, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { X, ArrowLeft, MessageSquare, Send } from 'lucide-react';

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({ isOpen, onClose, application }) => {
  const { currentUser, authFetch } = useAuth();
  const { showToast } = useToast();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<any>(null);

  const openConversation = useCallback(async () => {
    if (!application) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: application.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to open conversation');
      }
      const data = await res.json();
      setConversation(data.conversation);
      setMessages(data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [application, authFetch, onClose, showToast]);

  const fetchMessages = useCallback(async () => {
    if (!conversation) return;
    try {
      const res = await authFetch(`/api/conversations/${conversation.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  }, [conversation, authFetch]);

  useEffect(() => {
    if (isOpen) {
      setConversation(null);
      setMessages([]);
      setDraft('');
      openConversation();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, openConversation]);

  useEffect(() => {
    if (isOpen && conversation) {
      timerRef.current = setInterval(fetchMessages, 5000);
      return () => clearInterval(timerRef.current);
    }
  }, [isOpen, conversation, fetchMessages]);

  if (!isOpen) return null;

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !conversation) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }
      setDraft('');
      await fetchMessages();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err: any) {
      showToast('Send Error', err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                Interview Conversation
              </h2>
              <p className="text-xs text-slate-400">
                {application?.candidate_name} &middot; {application?.job_title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 shrink-0"
            aria-label="Close conversation"
          >
            <ArrowLeft size={18} className="sm:hidden" />
            <X size={18} className="hidden sm:block" />
            <span className="sm:hidden text-xs font-bold">Back</span>
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/60 min-h-[320px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <div className="animate-spin w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full mb-3" />
              <p className="text-xs font-semibold">Opening conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <MessageSquare size={28} className="mb-3" />
              <p className="text-xs font-semibold">
                No messages yet — send the first message to {application?.candidate_name}.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUser?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${mine
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm shadow-sm'}`}>
                    <p className={`text-xs sm:text-[10px] font-bold mb-0.5 ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {m.sender_name}
                    </p>
                    {m.body}
                    <p className={`text-xs sm:text-[10px] mt-1 ${mine ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-end gap-2 shrink-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder={`Send a message to ${application?.candidate_name || 'the candidate'}…`}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
          ></textarea>
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};