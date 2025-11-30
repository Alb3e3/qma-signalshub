'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['signals:read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  async function fetchApiKeys() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setApiKeys(data || []);
    }
    setLoading(false);
  }

  async function createApiKey() {
    if (!newKeyName.trim()) return;

    setCreating(true);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: newKeyScopes,
        }),
      });

      const data = await response.json();

      if (data.key) {
        setCreatedKey(data.key);
        fetchApiKeys();
      } else {
        alert(data.error || 'Failed to create API key');
      }
    } catch {
      alert('Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function revokeApiKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchApiKeys();
      } else {
        alert('Failed to revoke API key');
      }
    } catch {
      alert('Failed to revoke API key');
    }
  }

  const availableScopes = [
    { id: 'signals:read', name: 'Read Signals', description: 'View trading signals' },
    { id: 'trades:read', name: 'Read Trades', description: 'View trade history' },
    { id: 'trades:write', name: 'Write Trades', description: 'Create trades (providers only)' },
    { id: 'providers:read', name: 'Read Providers', description: 'View provider information' },
    { id: 'leaderboard:read', name: 'Read Leaderboard', description: 'View leaderboard data' },
  ];

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
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                API Keys
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
            <h1 className="text-2xl font-bold text-white">API Keys</h1>
            <p className="mt-1 text-gray-400">
              Manage API keys for programmatic access to signals
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Create API Key
          </button>
        </div>

        {/* API Keys List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : apiKeys.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{key.name}</span>
                      {!key.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <code className="bg-gray-800 px-2 py-0.5 rounded">{key.prefix}...</code>
                      <span className="mx-2">•</span>
                      <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {key.scopes.map((scope) => (
                        <span key={scope} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                  {key.is_active && (
                    <button
                      onClick={() => revokeApiKey(key.id)}
                      className="px-3 py-1.5 border border-red-500/50 text-red-400 rounded text-sm hover:bg-red-500/10 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">No API Keys</h3>
              <p className="text-gray-500 text-sm">Create an API key to access signals programmatically</p>
            </div>
          )}
        </div>

        {/* API Documentation Link */}
        <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">API Documentation</h3>
          <p className="text-gray-400 text-sm mb-4">
            Learn how to use the SignalsHub API to integrate trading signals into your applications.
          </p>
          <div className="flex gap-4">
            <Link
              href="/docs/api"
              className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-800 transition-colors"
            >
              View Documentation
            </Link>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-800 transition-colors"
            >
              OpenAPI Spec
            </a>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
            {createdKey ? (
              <>
                <h2 className="text-xl font-bold text-white mb-4">API Key Created</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Make sure to copy your API key now. You won&apos;t be able to see it again!
                </p>
                <div className="bg-gray-800 rounded-lg p-3 mb-4">
                  <code className="text-green-400 text-sm break-all">{createdKey}</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdKey);
                    alert('Copied to clipboard!');
                  }}
                  className="w-full mb-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedKey(null);
                    setNewKeyName('');
                    setNewKeyScopes(['signals:read']);
                  }}
                  className="w-full py-2 px-4 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Create API Key</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="My API Key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      {availableScopes.map((scope) => (
                        <label key={scope.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newKeyScopes.includes(scope.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewKeyScopes([...newKeyScopes, scope.id]);
                              } else {
                                setNewKeyScopes(newKeyScopes.filter(s => s !== scope.id));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-sm text-white">{scope.name}</div>
                            <div className="text-xs text-gray-500">{scope.description}</div>
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
                    onClick={createApiKey}
                    disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Key'}
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
