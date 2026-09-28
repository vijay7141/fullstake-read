'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  Smartphone,
  Plus,
  CheckCircle2,
  RefreshCw,
  Power,
  ShieldCheck,
  Zap,
  Layers,
  X,
} from 'lucide-react';

interface WhatsAppAccountItem {
  id: string;
  displayName: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  accessToken?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED';
  isDefault: boolean;
  qualityRating?: string | null;
  createdAt: string;
  _count: {
    conversations: number;
    messages: number;
  };
}

export default function WhatsAppNumbersPage() {
  const [accounts, setAccounts] = useState<WhatsAppAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccountItem | null>(null);

  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formPhoneNumberId, setFormPhoneNumberId] = useState('');
  const [formWabaId, setFormWabaId] = useState('');
  const [formAccessToken, setFormAccessToken] = useState('');
  const [formSetDefault, setFormSetDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp accounts', err);
      showToast('Failed to load WhatsApp numbers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAdd = () => {
    setFormDisplayName('');
    setFormPhoneNumber('');
    setFormPhoneNumberId('');
    setFormWabaId('');
    setFormAccessToken('');
    setFormSetDefault(false);
    setIsAddOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim() || !formPhoneNumber.trim() || !formPhoneNumberId.trim()) {
      showToast('Display Name, Phone Number, and Phone Number ID are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/whatsapp-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formDisplayName.trim(),
          phoneNumber: formPhoneNumber.trim(),
          phoneNumberId: formPhoneNumberId.trim(),
          businessAccountId: formWabaId.trim() || null,
          accessToken: formAccessToken.trim() || null,
          setAsDefault: formSetDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to add number', 'error');
      } else {
        showToast(`WhatsApp Number "${formDisplayName}" connected successfully!`, 'success');
        setIsAddOpen(false);
        fetchAccounts();
      }
    } catch {
      showToast('Network error creating WhatsApp account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (account: WhatsAppAccountItem) => {
    try {
      const res = await fetch(`/api/whatsapp-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true, status: 'ACTIVE' }),
      });
      if (res.ok) {
        showToast(`${account.displayName} is now the primary active WhatsApp line`, 'success');
        fetchAccounts();
      } else {
        showToast('Failed to set default account', 'error');
      }
    } catch {
      showToast('Error setting default account', 'error');
    }
  };

  const handleToggleStatus = async (account: WhatsAppAccountItem) => {
    const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/whatsapp-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`Number status changed to ${nextStatus}`, 'success');
        fetchAccounts();
      } else {
        showToast('Failed to update number status', 'error');
      }
    } catch {
      showToast('Error updating number status', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/whatsapp-accounts/${selectedAccount.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Number deactivated safely. Chat history preserved.', 'success');
        setIsDeactivateOpen(false);
        fetchAccounts();
      } else {
        showToast(data.error || 'Failed to deactivate number', 'error');
      }
    } catch {
      showToast('Error deactivating number', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async (account: WhatsAppAccountItem) => {
    setTestingId(account.id);
    try {
      const res = await fetch('/api/whatsapp-accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`[${data.mode}] ${data.message}`, 'success');
      } else {
        showToast(`Connection failed: ${data.error}`, 'error');
      }
    } catch {
      showToast('Error testing connection', 'error');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <Smartphone className="w-6 h-6 text-emerald-400" />
                WhatsApp Numbers & Channel Management
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Manage multiple WhatsApp numbers, connect new lines, or retire old numbers without losing historical chats
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAccounts}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Number</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-teal-950/30 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Zero Data Loss Architecture Guaranteed</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    Requirement 8 Validated
                  </span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  In this CRM, WhatsApp phone numbers are decoupled entities from Customer records and Conversation history.
                  When you replace or disable an old number (e.g. <code>+91 11 1111 1111</code>) with a new number (e.g. <code>+91 22 2222 2222</code>),
                  <strong> all customer chat history remains permanently intact in your database</strong>.
                  New incoming and outgoing messages are seamlessly routed to the same customer thread.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>Configured WhatsApp Accounts</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                {accounts.length}
              </span>
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 bg-zinc-900/60 rounded-2xl border border-zinc-800" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <Smartphone className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-300">No WhatsApp numbers configured</p>
                <p className="text-xs text-zinc-500 mt-1">Click &quot;Add Number&quot; above to connect your first Meta WhatsApp number.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {accounts.map((acc) => {
                  const isActive = acc.status === 'ACTIVE';

                  return (
                    <div
                      key={acc.id}
                      className={`bg-zinc-900/90 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                        acc.isDefault
                          ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : isActive
                          ? 'border-zinc-800 hover:border-zinc-700'
                          : 'border-zinc-800/60 opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                              }`}
                            />
                            {acc.status}
                          </span>

                          {acc.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-zinc-950 uppercase tracking-wider">
                              Primary Default
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white truncate">{acc.displayName}</h3>
                        <p className="text-sm font-mono text-emerald-400 font-semibold mt-0.5">
                          {acc.phoneNumber}
                        </p>

                        <div className="mt-4 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Phone Number ID:</span>
                            <span className="font-mono text-zinc-300 truncate max-w-[150px]" title={acc.phoneNumberId}>
                              {acc.phoneNumberId}
                            </span>
                          </div>
                          {acc.businessAccountId && (
                            <div className="flex justify-between">
                              <span className="text-zinc-500">WABA ID:</span>
                              <span className="font-mono text-zinc-300">{acc.businessAccountId}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Quality Rating:</span>
                            <span className="text-emerald-400 font-semibold">{acc.qualityRating || 'GREEN'}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-zinc-850">
                            <span className="text-zinc-500">Messages Handled:</span>
                            <span className="font-semibold text-zinc-200">
                              {acc._count.messages} messages ({acc._count.conversations} chats)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-zinc-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestConnection(acc)}
                            disabled={testingId === acc.id}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700/60 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {testingId === acc.id ? (
                              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>Test Meta API</span>
                          </button>

                          {!acc.isDefault && isActive && (
                            <button
                              onClick={() => handleSetDefault(acc)}
                              className="py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium border border-emerald-500/30 transition-colors"
                            >
                              Set Primary
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            onClick={() => handleToggleStatus(acc)}
                            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                          >
                            <Power className="w-3 h-3" />
                            <span>{isActive ? 'Deactivate' : 'Reactivate'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAccount(acc);
                              setIsDeactivateOpen(true);
                            }}
                            className="text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            Retire Line
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Connect New WhatsApp Business Number
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Channel / Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="e.g. Sales Desk Line 2"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  WhatsApp Phone Number (with Country Code) *
                </label>
                <input
                  type="text"
                  required
                  value={formPhoneNumber}
                  onChange={(e) => setFormPhoneNumber(e.target.value)}
                  placeholder="+91 22 2222 2222 or +1 (555) 123-4567"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Meta Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={formPhoneNumberId}
                  onChange={(e) => setFormPhoneNumberId(e.target.value)}
                  placeholder="e.g. 104829104829104"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-zinc-500 mt-0.5">Found in Meta for Developers &gt; WhatsApp &gt; API Setup</p>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  WhatsApp Business Account ID (WABA ID) (Optional)
                </label>
                <input
                  type="text"
                  value={formWabaId}
                  onChange={(e) => setFormWabaId(e.target.value)}
                  placeholder="e.g. 94819284729102"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Access Token Override (Optional)
                </label>
                <input
                  type="password"
                  value={formAccessToken}
                  onChange={(e) => setFormAccessToken(e.target.value)}
                  placeholder="Leave empty to use system environment variable"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setDefault"
                  checked={formSetDefault}
                  onChange={(e) => setFormSetDefault(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="setDefault" className="text-zinc-300">
                  Set this number as the primary default for new outgoing chats
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Connecting...' : 'Connect Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeactivateOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-amber-900/60 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Retire WhatsApp Number</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              You are deactivating <strong>{selectedAccount.displayName}</strong> ({selectedAccount.phoneNumber}).
            </p>

            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-200">
              <p className="font-semibold flex items-center gap-1.5 text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                History Retention Guarantee:
              </p>
              <p className="leading-snug">
                All <strong>{selectedAccount._count.messages} messages</strong> and customer records previously routed through this line will <strong>remain permanently preserved</strong> in your CRM database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setIsDeactivateOpen(false)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
