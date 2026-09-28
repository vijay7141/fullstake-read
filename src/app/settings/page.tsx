'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  Settings,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Zap,
  RefreshCw,
  Send,
  Terminal,
  Lock,
  Layers,
} from 'lucide-react';

interface StatsData {
  connectedNumber: {
    id: string;
    displayName: string;
    phoneNumber: string;
    phoneNumberId: string;
    qualityRating: string;
    status: string;
    isDefault: boolean;
  } | null;
  systemStatus: {
    metaApiMode: string;
    webhookVerifyToken: string;
    hasAppSecret: boolean;
    webhookEventsLogged: number;
  };
  recentWebhookEvents: Array<{
    id: string;
    eventId?: string | null;
    eventType: string;
    payload: string;
    processed: boolean;
    createdAt: string;
  }>;
}

export default function SettingsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [simPhone, setSimPhone] = useState('919876543210');
  const [simName, setSimName] = useState('Rahul Sharma');
  const [simText, setSimText] = useState('Hello! I want to inquire about the pricing.');
  const [simulating, setSimulating] = useState(false);

  const { showToast } = useToast();

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/whatsapp`
    : 'https://your-domain.com/api/webhook/whatsapp';

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    showToast('Copied to clipboard', 'info');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp-accounts/test', {
        method: 'POST',
      });
      const resData = await res.json();
      if (resData.success) {
        setTestResult(`[${resData.mode}] ${resData.message}`);
        showToast(resData.message, 'success');
      } else {
        setTestResult(`[ERROR] ${resData.error || 'Failed to authenticate'}`);
        showToast(resData.error || 'Connection test failed', 'error');
      }
    } catch {
      setTestResult('Network error while testing Meta Graph API connection');
      showToast('Network error during test', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!simText.trim()) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_incoming',
          fromPhone: simPhone,
          senderName: simName,
          text: simText,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        showToast('Simulated incoming message sent through webhook pipeline!', 'success');
        fetchSettings();
      } else {
        showToast(resData.error || 'Simulation failed', 'error');
      }
    } catch {
      showToast('Error during simulation', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <Settings className="w-6 h-6 text-emerald-400" />
                WhatsApp CRM Settings
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Configure official Meta Cloud API credentials, Webhook callbacks, and verify end-to-end integration
              </p>
            </div>
            <button
              onClick={fetchSettings}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2 self-start"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  Connected WhatsApp Business Line
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Currently active phone number routing outgoing CRM messages
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {data?.connectedNumber?.status || 'CONNECTED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs">
              <div>
                <span className="text-zinc-500 block">Display Name</span>
                <span className="font-semibold text-zinc-100 text-sm mt-0.5 block">
                  {data?.connectedNumber?.displayName || 'Primary Line'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">WhatsApp Number</span>
                <span className="font-mono text-emerald-400 text-sm font-semibold mt-0.5 block">
                  {data?.connectedNumber?.phoneNumber || '+1 (555) 019-2834'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Phone Number ID</span>
                <span className="font-mono text-zinc-300 text-xs mt-0.5 block truncate">
                  {data?.connectedNumber?.phoneNumberId || 'meta_phone_primary_555'}
                </span>
              </div>
            </div>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                {testResult}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                {testing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Meta API Connection</span>
              </button>

              <Link
                href="/numbers"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700/60 flex items-center gap-2 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Replace Number / Manage Multiple Numbers</span>
              </Link>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                Meta Webhook Configuration
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Provide these exact values inside the Meta for Developers console under WhatsApp &gt; Configuration
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Callback URL (Webhook Endpoint)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrl, true)}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700/60 flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Verify Token (hub.verify_token)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="whatsapp_crm_verify_token_secure_2025"
                    className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard('whatsapp_crm_verify_token_secure_2025', false)}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700/60 flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Configure this in your Meta App Dashboard and subscribe to the <code>messages</code> webhook field.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-3 text-xs">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-zinc-300 leading-relaxed">
                  <strong className="text-white">Security Standard Enforced:</strong> Sensitive access tokens are loaded securely from server-side environment variables and database records, and are never exposed in frontend code. Incoming requests can also be cryptographically verified using Meta&apos;s <code>X-Hub-Signature-256</code> header.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  Interactive Webhook Test Bench & Event Inspector
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Simulate incoming WhatsApp customer messages and inspect raw Meta webhook payloads stored in the database
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  placeholder="919876543210"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Message Text</label>
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="I want to know the price."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSimulateWebhook}
                disabled={simulating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50"
              >
                {simulating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Simulated Incoming Webhook</span>
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Recent Audit Trail Webhook Events (Idempotency Table)
              </h3>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-850">
                {data?.recentWebhookEvents?.length === 0 ? (
                  <p className="p-4 text-center text-xs text-zinc-500">No webhook events logged yet.</p>
                ) : (
                  data?.recentWebhookEvents?.map((evt) => (
                    <div key={evt.id} className="p-3 text-xs flex items-center justify-between hover:bg-zinc-900/60 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-mono text-emerald-400 font-semibold uppercase">{evt.eventType}</span>
                        <span className="text-zinc-500 font-mono truncate max-w-xs">{evt.eventId || 'event'}</span>
                      </div>
                      <span className="text-[11px] text-zinc-500 shrink-0">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
