'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { id: 'signal.created', name: 'Signal Created', description: 'When a new signal is published' },
  { id: 'signal.closed', name: 'Signal Closed', description: 'When a signal is closed' },
  { id: 'trade.opened', name: 'Trade Opened', description: 'When a provider opens a trade' },
  { id: 'trade.closed', name: 'Trade Closed', description: 'When a provider closes a trade' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['signal.created']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('webhooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setWebhooks(data || []);
    }
    setLoading(false);
  }

  async function createWebhook() {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;

    setCreating(true);

    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newWebhookUrl,
          events: newWebhookEvents,
        }),
      });

      const data = await response.json();

      if (data.secret) {
        setCreatedSecret(data.secret);
        fetchWebhooks();
      } else {
        alert(data.error || 'Failed to create webhook');
      }
    } catch {
      alert('Failed to create webhook');
    } finally {
      setCreating(false);
    }
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        fetchWebhooks();
      } else {
        alert('Failed to update webhook');
      }
    } catch {
      alert('Failed to update webhook');
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchWebhooks();
      } else {
        alert('Failed to delete webhook');
      }
    } catch {
      alert('Failed to delete webhook');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                SignalsHub
              </Link>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                Webhooks
              </span>
            </div>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Webhooks</h1>
            <p className="mt-1 text-gray-400">
              Receive real-time notifications when signals are published
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Add Webhook
          </button>
        </div>

        {/* Webhooks List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : webhooks.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <code className="text-sm text-white truncate">{webhook.url}</code>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {webhook.events.map((event) => (
                          <span key={event} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                            {event}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {webhook.failure_count > 0 && (
                          <span className="text-red-400 mr-3">
                            {webhook.failure_count} failures
                          </span>
                        )}
                        {webhook.last_triggered_at && (
                          <span>
                            Last triggered {new Date(webhook.last_triggered_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          webhook.is_active
                            ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {webhook.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="px-3 py-1.5 border border-red-500/50 text-red-400 rounded text-sm hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">No Webhooks</h3>
              <p className="text-gray-500 text-sm">Add a webhook to receive real-time signal notifications</p>
            </div>
          )}
        </div>

        {/* Webhook Documentation */}
        <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">Webhook Payload Format</h3>
          <p className="text-gray-400 text-sm mb-4">
            Webhooks are sent as POST requests with a JSON payload. Verify the signature using the X-Signature-256 header.
          </p>
          <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "id": "evt_...",
  "event": "signal.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "signal_id": "...",
    "pair": "BTC/USDT",
    "direction": "long",
    "entry_price": 42000.00,
    "stop_loss": 41500.00,
    "take_profit": 43000.00,
    "provider_name": "TopTrader"
  }
}`}
          </pre>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            {createdSecret ? (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Webhook Created</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Save your webhook secret. You&apos;ll need it to verify webhook signatures.
                </p>
                <div className="bg-gray-800 rounded-lg p-3 mb-4">
                  <code className="text-green-400 text-sm break-all">{createdSecret}</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdSecret);
                    alert('Copied to clipboard!');
                  }}
                  className="w-full mb-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedSecret(null);
                    setNewWebhookUrl('');
                    setNewWebhookEvents(['signal.created']);
                  }}
                  className="w-full py-2 px-4 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Add Webhook</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://your-server.com/webhook"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Events
                    </label>
                    <div className="space-y-2">
                      {EVENT_TYPES.map((event) => (
                        <label key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWebhookEvents.includes(event.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewWebhookEvents([...newWebhookEvents, event.id]);
                              } else {
                                setNewWebhookEvents(newWebhookEvents.filter(e => e !== event.id));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-sm text-white">{event.name}</div>
                            <div className="text-xs text-gray-500">{event.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 px-4 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createWebhook}
                    disabled={creating || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Webhook'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
