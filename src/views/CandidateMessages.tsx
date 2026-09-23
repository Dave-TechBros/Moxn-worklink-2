import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { MessageSquare, Send, ArrowLeft, BriefcaseBusiness } from 'lucide-react';

const Avatar: React.FC<{ name: string; src?: string }> = ({ name, src }) =>
  src ? (
    <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
      {name.charAt(0)?.toUpperCase() || '?'}
    </div>
  );

export const CandidateMessages: React.FC = () => {
  const { currentUser, authFetch } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<{ conversation: Conversation; messageCount: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeConversationId = activeConv?.id || null;
  const scrollTimer = useRef<any>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await authFetch('/api/conversations');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
      if (data.conversations?.length && !activeConversationId) {
        setActiveConv(data.conversations[0].conversation);
        setMobileOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeConversationId]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    setMessagesLoading(true);
    try {
      const res = await authFetch(`/api/conversations/${activeConversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (scrollTimer.current) clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [activeConversationId]);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConv(conv);
    setMobileOpen(true);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !activeConversationId) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/conversations/${activeConversationId}/messages`, {
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
      fetchConversations();
    } catch (err: any) {
      showToast('Send Error', err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleBackToList = () => {
    setActiveConv(null);
    setMobileOpen(false);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  // Poll for new messages while a conversation is open.
  useEffect(() => {
    if (!activeConversationId) return;
    const timer = setInterval(() => {
      fetchMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mb-4" />
        <p className="text-sm font-semibold">Loading your messages…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Interview communication between you and the companies you've applied to.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <MessageSquare className="text-indigo-500" size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No conversations yet</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            When a company reviews your application and starts an interview conversation, it will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[560px]">
          {/* Conversation list */}
          <div className={`md:w-80 lg:w-96 border-r border-slate-200 flex flex-col ${mobileOpen ? 'hidden md:flex' : 'flex'} w-full`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversations</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {conversations.map(({ conversation }) => {
                const isActive = activeConversationId === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer flex gap-3 ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {conversation.company_name.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{conversation.company_name}</p>
                      <p className="text-xs text-slate-500 truncate">{conversation.job_title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {new Date(conversation.last_message_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread */}
          <div className={`flex-1 flex flex-col ${mobileOpen ? 'flex' : 'hidden md:flex'} min-h-[400px]`}>
            {activeConv ? (
              <>
                <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {activeConv.company_name.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{activeConv.company_name}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <BriefcaseBusiness size={12} className="text-indigo-400" />
                      {activeConv.job_title}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-slate-50/60">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-10 text-slate-400 text-xs font-semibold">
                      Loading conversation…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center py-10 text-slate-400 text-xs font-semibold">
                      No messages yet — say hello and start the interview conversation.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === currentUser?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-2 max-w-[80%] sm:max-w-[70%] ${mine ? 'flex-row-reverse' : ''}`}>
                            <div className="mt-1 shrink-0">
                              <Avatar name={m.sender_name} />
                            </div>
                            <div className={mine ? 'text-right' : ''}>
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-[11px] font-bold text-slate-500">{m.sender_name}</span>
                              </div>
                              <div
                                className={`mt-1 px-4 py-2.5 text-sm leading-relaxed ${
                                  mine
                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm shadow-sm'
                                }`}
                              >
                                {m.body}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(m.created_at).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex items-end gap-2">
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
                    placeholder="Write a reply to the hiring team…"
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
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                <MessageSquare size={32} className="mb-3" />
                <p className="text-sm font-semibold">Select a conversation to view messages.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};