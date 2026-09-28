'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useRealtime } from '@/hooks/useRealtime';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  User,
  Info,
  ChevronLeft,
  Sparkles,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  X,
  Edit2,
  Save,
} from 'lucide-react';
import { isWithin24Hours } from '@/lib/whatsapp';

interface MessageItem {
  id: string;
  whatsappMessageId?: string | null;
  conversationId: string;
  customerId: string;
  whatsappAccountId?: string | null;
  direction: 'INCOMING' | 'OUTGOING';
  messageType: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorCode?: string | null;
  errorMessage?: string | null;
  timestamp: string;
  whatsappAccount?: {
    id: string;
    displayName: string;
    phoneNumber: string;
    status: string;
  } | null;
}

interface ConversationItem {
  id: string;
  customerId: string;
  whatsappAccountId?: string | null;
  status: string;
  lastMessageAt: string;
  lastMessageText?: string | null;
  lastMessageDirection?: string | null;
  unreadCount: number;
  customer: {
    id: string;
    name?: string | null;
    phoneNumber: string;
    formattedPhone?: string | null;
    notes?: string | null;
    tags?: string | null;
    createdAt: string;
  };
  whatsappAccount?: {
    id: string;
    displayName: string;
    phoneNumber: string;
    status: string;
  } | null;
}

interface WhatsAppAccountItem {
  id: string;
  displayName: string;
  phoneNumber: string;
  phoneNumberId: string;
  status: string;
  isDefault: boolean;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get('id');
  const urlCustomerId = searchParams.get('customerId');

  const { showToast } = useToast();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(urlConvId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<WhatsAppAccountItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'RESOLVED'>('ALL');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [showDetails, setShowDetails] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);

        if (urlCustomerId && !selectedConvId) {
          const match = (data.conversations || []).find((c: ConversationItem) => c.customerId === urlCustomerId);
          if (match) {
            setSelectedConvId(match.id);
            setMobileChatOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/whatsapp-accounts');
      if (res.ok) {
        const data = await res.json();
        setAvailableAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp accounts', err);
    }
  };

  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        const activeConv = conversations.find((c) => c.id === convId);
        if (activeConv && activeConv.unreadCount > 0) {
          await fetch(`/api/conversations/${convId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAsRead: true }),
          });
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      setMobileChatOpen(true);
      const conv = conversations.find((c) => c.id === selectedConvId);
      if (conv) {
        setEditName(conv.customer.name || '');
        setEditNotes(conv.customer.notes || '');
        setEditTags(conv.customer.tags || '');
      }
    } else if (conversations.length > 0 && !mobileChatOpen) {
      setSelectedConvId(conversations[0].id);
      fetchMessages(conversations[0].id);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useRealtime((payload) => {
    const eventData = payload.data as {
      message?: MessageItem;
      messageId?: string;
      whatsappMessageId?: string;
      status?: MessageItem['status'];
      error?: string;
    } | undefined;

    if (payload.type === 'message:new') {
      const newMsg = eventData?.message;
      if (newMsg && newMsg.conversationId === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || (m.whatsappMessageId && m.whatsappMessageId === newMsg.whatsappMessageId))) {
            return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
          }
          return [...prev, newMsg];
        });
      }
      fetchConversations(true);
    } else if (payload.type === 'message:status') {
      const { messageId, whatsappMessageId, status, error } = eventData || {};
      if (status) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId || (whatsappMessageId && m.whatsappMessageId === whatsappMessageId)) {
              return { ...m, status, errorMessage: error || m.errorMessage };
            }
            return m;
          })
        );
      }
    } else if (payload.type === 'conversation:update') {
      fetchConversations(true);
    }
  });

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  const lastIncomingMsg = useMemo(() => {
    const incoming = [...messages].reverse().find((m) => m.direction === 'INCOMING');
    return incoming?.timestamp || null;
  }, [messages]);

  const serviceWindowActive = useMemo(() => {
    if (!lastIncomingMsg) return false;
    return isWithin24Hours(lastIncomingMsg);
  }, [lastIncomingMsg]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedConvId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          text: messageText,
          whatsappAccountId: activeConversation?.whatsappAccountId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to send message', 'error');
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      } else {
        if (data.isSimulated) {
          showToast('Message sent via WhatsApp Simulator Mode', 'info');
        }
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) {
              return prev.map((m) => (m.id === data.message.id ? data.message : m));
            }
            return [...prev, data.message];
          });
        }
      }
    } catch {
      showToast('Network error while dispatching message', 'error');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const sendCannedResponse = (text: string) => {
    setInputText(text);
    textareaRef.current?.focus();
  };

  const toggleResolved = async () => {
    if (!activeConversation) return;
    const newStatus = activeConversation.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Conversation marked as ${newStatus.toLowerCase()}`, 'success');
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, status: newStatus } : c))
        );
      }
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const switchAccount = async (newAccountId: string) => {
    if (!activeConversation) return;
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappAccountId: newAccountId }),
      });
      if (res.ok) {
        const matchingAcc = availableAccounts.find((a) => a.id === newAccountId);
        showToast(`Switched active WhatsApp channel to ${matchingAcc?.displayName || 'selected number'}`, 'success');
        fetchConversations(true);
        fetchMessages(activeConversation.id, true);
      }
    } catch {
      showToast('Failed to switch channel', 'error');
    }
  };

  const handleSaveCustomer = async () => {
    if (!activeConversation) return;
    setSavingCustomer(true);
    try {
      const res = await fetch(`/api/contacts/${activeConversation.customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          notes: editNotes,
          tags: editTags,
        }),
      });
      if (res.ok) {
        showToast('Customer profile updated', 'success');
        setEditingCustomer(false);
        fetchConversations(true);
      } else {
        showToast('Failed to update contact', 'error');
      }
    } catch {
      showToast('Error saving contact details', 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer.phoneNumber.includes(searchQuery) ||
        c.customer.formattedPhone?.includes(searchQuery) ||
        c.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'UNREAD') return c.unreadCount > 0;
      if (filterTab === 'RESOLVED') return c.status === 'RESOLVED';
      return true;
    });
  }, [conversations, searchQuery, filterTab]);

  return (
    <AppLayout>
      <div className="flex-1 flex h-full overflow-hidden bg-zinc-950 relative">
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col bg-zinc-900 border-r border-zinc-800 shrink-0 h-full ${
            mobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Chats</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  {conversations.length}
                </span>
              </h2>
              <button
                onClick={() => fetchConversations()}
                title="Refresh chats"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers or messages..."
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-medium transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterTab('UNREAD')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  filterTab === 'UNREAD'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Unread</span>
              </button>
              <button
                onClick={() => setFilterTab('RESOLVED')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-medium transition-all ${
                  filterTab === 'RESOLVED'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
            {loadingConvs ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse items-center">
                    <div className="w-11 h-11 rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-zinc-800 rounded w-1/3" />
                      <div className="h-3 bg-zinc-800/60 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                <User className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                No conversations found matching filters.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const formattedTime = new Date(conv.lastMessageAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileChatOpen(true);
                    }}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-zinc-800/80 border-l-4 border-l-emerald-500'
                        : 'hover:bg-zinc-800/40 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-800 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                      {(conv.customer.name || 'C').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-zinc-100 truncate">
                          {conv.customer.name || 'WhatsApp Customer'}
                        </p>
                        <span className="text-[11px] text-zinc-400 shrink-0 ml-1">
                          {formattedTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono mb-1">
                        <span>{conv.customer.formattedPhone || conv.customer.phoneNumber}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-zinc-400 truncate flex-1">
                          {conv.lastMessageDirection === 'OUTGOING' && (
                            <span className="text-emerald-400 mr-1 font-medium">You:</span>
                          )}
                          {conv.lastMessageText || 'No messages yet'}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {conv.status === 'RESOLVED' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Resolved
                            </span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[11px] flex items-center justify-center shadow">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden ${
            !mobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              <div className="h-16 px-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between shrink-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {(activeConversation.customer.name || 'C').charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {activeConversation.customer.name || 'WhatsApp Customer'}
                      </h3>
                      {activeConversation.customer.tags && (
                        <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          {activeConversation.customer.tags.split(',')[0]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="font-mono">{activeConversation.customer.formattedPhone || activeConversation.customer.phoneNumber}</span>
                      <span>•</span>
                      <span className="text-zinc-300 font-medium flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-emerald-400" />
                        <span>{activeConversation.whatsappAccount?.displayName || 'Primary Line'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      serviceWindowActive
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                    }`}
                    title={
                      serviceWindowActive
                        ? 'Meta 24-Hour Customer Service Window is OPEN. Freeform messages allowed.'
                        : '24h Customer Service Window expired. Meta requires pre-approved templates for outgoing.'
                    }
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{serviceWindowActive ? '24h Window Active' : 'Window Closed'}</span>
                  </div>

                  <button
                    onClick={toggleResolved}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      activeConversation.status === 'RESOLVED'
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {activeConversation.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    title="Customer Details"
                    className={`p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${
                      showDetails ? 'bg-zinc-800 text-white' : ''
                    }`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-zinc-950 relative">
                <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs space-y-2">
                    <p className="font-medium text-zinc-400">No message history yet.</p>
                    <p className="max-w-xs">Send a reply below or simulate an incoming message to start chatting.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isOutgoing = msg.direction === 'OUTGOING';
                      const prevMsg = index > 0 ? messages[index - 1] : null;

                      const channelChanged =
                        prevMsg &&
                        prevMsg.whatsappAccountId &&
                        msg.whatsappAccountId &&
                        prevMsg.whatsappAccountId !== msg.whatsappAccountId;

                      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <React.Fragment key={msg.id}>
                          {channelChanged && (
                            <div className="my-4 py-2 px-4 rounded-xl bg-zinc-900 border border-emerald-500/30 text-center max-w-lg mx-auto shadow-sm">
                              <p className="text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>WhatsApp Channel Transition</span>
                              </p>
                              <p className="text-[11px] text-zinc-300 mt-0.5">
                                Messages below routed via <strong>{msg.whatsappAccount?.displayName || 'New WhatsApp Line'}</strong> ({msg.whatsappAccount?.phoneNumber || 'Active'}).
                                Historical chat records from prior number are permanently preserved.
                              </p>
                            </div>
                          )}

                          <div
                            className={`flex flex-col ${
                              isOutgoing ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative group ${
                                isOutgoing
                                  ? 'bg-[#005c4b] text-white rounded-br-xs'
                                  : 'bg-zinc-800 text-zinc-100 rounded-bl-xs border border-zinc-750'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed break-words text-[13.5px]">
                                {msg.text}
                              </p>

                              <div
                                className={`flex items-center justify-end gap-1.5 mt-1 text-[10.5px] ${
                                  isOutgoing ? 'text-emerald-200/80' : 'text-zinc-400'
                                }`}
                              >
                                <span>{timeStr}</span>

                                {isOutgoing && (
                                  <span className="flex items-center">
                                    {msg.status === 'SENDING' && (
                                      <span title="Sending...">
                                        <Clock className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                                      </span>
                                    )}
                                    {msg.status === 'SENT' && (
                                      <span title="Sent to WhatsApp Server">
                                        <Check className="w-3.5 h-3.5 text-zinc-300" />
                                      </span>
                                    )}
                                    {msg.status === 'DELIVERED' && (
                                      <span title="Delivered to customer device">
                                        <CheckCheck className="w-3.5 h-3.5 text-zinc-300" />
                                      </span>
                                    )}
                                    {msg.status === 'READ' && (
                                      <span title="Read by customer">
                                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                      </span>
                                    )}
                                    {msg.status === 'FAILED' && (
                                      <span className="flex items-center gap-1 text-red-300 font-semibold" title={msg.errorMessage || 'Failed to send'}>
                                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                        <span>Failed</span>
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>

                              {msg.whatsappAccount && (
                                <div className="hidden group-hover:block absolute bottom-full mb-1 right-0 bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                                  via {msg.whatsappAccount.displayName} ({msg.whatsappAccount.phoneNumber})
                                </div>
                              )}
                            </div>

                            {msg.status === 'FAILED' && msg.errorMessage && (
                              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                                <span>{msg.errorMessage}</span>
                              </p>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0 scrollbar-none">
                <span className="text-[11px] font-semibold text-zinc-400 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Canned:
                </span>
                <button
                  type="button"
                  onClick={() => sendCannedResponse('Hello! Thank you for reaching out. How can I help you today?')}
                  className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 shrink-0 transition-colors"
                >
                  Greeting
                </button>
                <button
                  type="button"
                  onClick={() => sendCannedResponse('Sure, I will share the pricing details and brochure shortly.')}
                  className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 shrink-0 transition-colors"
                >
                  Pricing
                </button>
                <button
                  type="button"
                  onClick={() => sendCannedResponse('Our support executive has noted this and will assist you right away.')}
                  className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 shrink-0 transition-colors"
                >
                  Support Escalation
                </button>
                <button
                  type="button"
                  onClick={() => sendCannedResponse('Thank you for contacting us. Have a wonderful day!')}
                  className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 shrink-0 transition-colors"
                >
                  Close Query
                </button>
              </div>

              <div className="p-3.5 bg-zinc-900 border-t border-zinc-800 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
                  <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder="Type a message (Press Enter to send, Shift+Enter for newline)..."
                      className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none max-h-32 px-1.5 py-1"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="h-11 w-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </form>

                {!serviceWindowActive && (
                  <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      Customer last messaged more than 24 hours ago. Meta policy requires approved templates for initiating new outbound conversations outside 24h.
                    </span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">WhatsApp CRM Chat</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Select a customer from the left list to view complete chat history and reply directly via the WhatsApp Business Cloud API.
              </p>
            </div>
          )}
        </div>

        {showDetails && activeConversation && (
          <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shrink-0 animate-in slide-in-from-right-5 duration-200">
            <div className="h-16 px-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                Customer Details
              </span>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              <div className="text-center pb-4 border-b border-zinc-800">
                <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xl flex items-center justify-center mx-auto mb-2">
                  {(activeConversation.customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <h4 className="text-sm font-bold text-white">{activeConversation.customer.name}</h4>
                <p className="text-xs font-mono text-emerald-400 mt-0.5">
                  {activeConversation.customer.formattedPhone || activeConversation.customer.phoneNumber}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Customer since {new Date(activeConversation.customer.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">Profile Information</span>
                  {!editingCustomer ? (
                    <button
                      onClick={() => setEditingCustomer(true)}
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveCustomer}
                      disabled={savingCustomer}
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Customer Name</label>
                  {editingCustomer ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                    />
                  ) : (
                    <p className="text-zinc-200 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800">
                      {activeConversation.customer.name || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Tags (Comma-separated)</label>
                  {editingCustomer ? (
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="VIP, Lead, Enterprise"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                    />
                  ) : (
                    <p className="text-zinc-200 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800">
                      {activeConversation.customer.tags || 'No tags'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">CRM Notes</label>
                  {editingCustomer ? (
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white resize-none"
                    />
                  ) : (
                    <p className="text-zinc-200 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 whitespace-pre-wrap">
                      {activeConversation.customer.notes || 'No notes added'}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <span className="font-semibold text-zinc-300 block">Assigned WhatsApp Channel</span>
                <p className="text-[11px] text-zinc-400">
                  Switch the active line used to reply to this customer without affecting chat history:
                </p>

                <select
                  value={activeConversation.whatsappAccountId || ''}
                  onChange={(e) => switchAccount(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {availableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayName} ({acc.phoneNumber}) {acc.status !== 'ACTIVE' ? `[${acc.status}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 text-zinc-400">
                <p>Messages in this thread: <strong className="text-white">{messages.length}</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
