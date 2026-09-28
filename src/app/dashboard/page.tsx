'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useRealtime } from '@/hooks/useRealtime';
import { useToast } from '@/context/ToastContext';
import {
  Users,
  MessageSquare,
  MailCheck,
  Send,
  Smartphone,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface StatsData {
  stats: {
    totalContacts: number;
    totalConversations: number;
    totalUnreadMessages: number;
    messagesToday: {
      total: number;
      incoming: number;
      outgoing: number;
    };
  };
  connectedNumber: {
    id: string;
    displayName: string;
    phoneNumber: string;
    phoneNumberId: string;
    qualityRating: string;
    status: string;
    isDefault: boolean;
  } | null;
  totalNumbersCount: number;
  systemStatus: {
    metaApiMode: string;
    webhookVerifyToken: string;
    hasAppSecret: boolean;
    webhookEventsLogged: number;
  };
  recentConversations: Array<{
    id: string;
    status: string;
    lastMessageAt: string;
    lastMessageText: string;
    unreadCount: number;
    customer: {
      id: string;
      name: string;
      phoneNumber: string;
      formattedPhone: string;
    };
    whatsappAccount?: {
      displayName: string;
      phoneNumber: string;
    };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simPhone, setSimPhone] = useState('919876543210');
  const [simName, setSimName] = useState('Rahul Sharma');
  const [simMessage, setSimMessage] = useState('Hello! Can you tell me the current price?');

  const { showToast } = useToast();

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useRealtime((payload) => {
    if (payload.type === 'message:new' || payload.type === 'message:status' || payload.type === 'conversation:update') {
      fetchStats();
    }
  });

  const handleSimulateMessage = async () => {
    if (!simMessage.trim()) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_incoming',
          fromPhone: simPhone,
          senderName: simName,
          text: simMessage,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showToast(`Simulated incoming message from ${simName} received!`, 'success');
        fetchStats();
      } else {
        showToast(result.error || 'Simulation failed', 'error');
      }
    } catch {
      showToast('Network error during simulation', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                Dashboard Overview
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Operations
                </span>
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Official Meta WhatsApp Cloud API connection status and messaging performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchStats}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/80 text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              <Link
                href="/chat"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Chat Inbox</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-zinc-900/60 rounded-2xl border border-zinc-800" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Total Contacts
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {data?.stats?.totalContacts ?? 0}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      <span>Stored permanently in DB</span>
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Total Conversations
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {data?.stats?.totalConversations ?? 0}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      <span>Customer chat threads</span>
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Unread Messages
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <MailCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-emerald-400 tracking-tight">
                        {data?.stats?.totalUnreadMessages ?? 0}
                      </p>
                      {Boolean(data?.stats?.totalUnreadMessages) && (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Action needed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">Pending customer inquiries</p>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Messages Today
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {data?.stats?.messagesToday?.total ?? 0}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                      <span className="text-emerald-400">↓ {data?.stats?.messagesToday?.incoming ?? 0} in</span>
                      <span>•</span>
                      <span className="text-blue-400">↑ {data?.stats?.messagesToday?.outgoing ?? 0} out</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-base font-semibold text-zinc-100">
                          Connected WhatsApp Business Number
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Active phone line routed through official Meta Graph API
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {data?.connectedNumber?.status || 'CONNECTED'}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                    <div>
                      <p className="text-[11px] text-zinc-400 font-medium">Channel Name</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-0.5">
                        {data?.connectedNumber?.displayName || 'Primary Line'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400 font-medium">WhatsApp Number</p>
                      <p className="text-sm font-semibold text-emerald-400 font-mono mt-0.5">
                        {data?.connectedNumber?.phoneNumber || '+1 (555) 019-2834'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400 font-medium">Meta Phone Number ID</p>
                      <p className="text-xs font-mono text-zinc-300 mt-0.5 truncate" title={data?.connectedNumber?.phoneNumberId}>
                        {data?.connectedNumber?.phoneNumberId || 'meta_phone_primary_555'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs text-zinc-400 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-4">
                      <span>Quality: <strong className="text-emerald-400">{data?.connectedNumber?.qualityRating || 'GREEN'}</strong></span>
                      <span>Configured Numbers: <strong className="text-zinc-200">{data?.totalNumbersCount || 1}</strong></span>
                    </div>
                    <Link
                      href="/numbers"
                      className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Manage Numbers / Replace Line</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-teal-400" />
                        <h2 className="text-base font-semibold text-zinc-100">Meta Webhook</h2>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Webhook endpoint verified for instant incoming messages
                    </p>

                    <div className="mt-5 space-y-3 text-xs">
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400">API Mode</span>
                        <span className="font-semibold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded">
                          {data?.systemStatus.metaApiMode === 'LIVE_CLOUD_API' ? 'Live Cloud API' : 'Simulator / Test Mode'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Webhook Verification</span>
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {data?.systemStatus.webhookVerifyToken}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-zinc-400">Audit Trail Events</span>
                        <span className="font-mono text-zinc-300">{data?.systemStatus.webhookEventsLogged || 0} logged</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/settings"
                    className="mt-4 w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700/60 transition-colors"
                  >
                    <span>View Webhook Config & Secrets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-teal-950/30 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Test Webhook Ingestion & Real-Time Inbox
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Simulate a customer sending a WhatsApp message. It will be processed through the official Meta webhook handler, stored in DB, and pushed to the CRM in real-time.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Customer Phone (E.164)
                    </label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      placeholder="919876543210"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Message Text
                    </label>
                    <input
                      type="text"
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      placeholder="I want to know the price."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={handleSimulateMessage}
                    disabled={simulating}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
                  >
                    {simulating ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Simulate Incoming WhatsApp Message</span>
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">Recent Customer Inquiries</h3>
                    <p className="text-xs text-zinc-400">Live conversations in CRM database</p>
                  </div>
                  <Link
                    href="/chat"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <span>View all chats</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {data?.recentConversations?.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 text-sm">
                      No conversations yet. Use the simulator above or configure the Meta webhook to receive messages.
                    </div>
                  ) : (
                    data?.recentConversations?.map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/chat?id=${conv.id}`}
                        className="py-3.5 px-3 -mx-3 rounded-xl hover:bg-zinc-800/50 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">
                            {conv.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                                {conv.customer.name}
                              </p>
                              <span className="text-xs text-zinc-400 font-mono">
                                {conv.customer.formattedPhone || conv.customer.phoneNumber}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {conv.lastMessageText || 'No message preview'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {conv.unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-zinc-950">
                              {conv.unreadCount} new
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400">
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
