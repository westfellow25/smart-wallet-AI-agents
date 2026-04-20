"use client";

import { useEffect, useState } from "react";
import { api, ApiKey } from "@/lib/api";
import { Modal } from "@/components/Modal";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await api.listApiKeys();
    setKeys(r.apiKeys);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Agents using it will stop working.")) return;
    await api.revokeApiKey(id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-gray-500">Keys for AI agents to authenticate with AgentVault API</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700">
          + New key
        </button>
      </div>

      {newKey && (
        <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">Your new API key (shown once):</p>
          <code className="block overflow-x-auto rounded bg-white p-3 font-mono text-xs">{newKey}</code>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900">
            I've saved it
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Scopes</th>
              <th className="px-5 py-3">Last used</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && keys.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No keys yet</td></tr>}
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{k.name}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-600">{k.keyPrefix}...</td>
                <td className="px-5 py-3 text-xs text-gray-500">{k.scopes.join(", ")}</td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-5 py-3">
                  <span className={`pill ${k.revokedAt ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {k.revokedAt ? "Revoked" : "Active"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {!k.revokedAt && (
                    <button onClick={() => revoke(k.id)} className="text-xs font-medium text-red-500 hover:text-red-600">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateKeyModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(key) => {
          setShowCreate(false);
          setNewKey(key);
          load();
        }}
      />
    </div>
  );
}

function CreateKeyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["transactions:write"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ALL_SCOPES = ["transactions:write", "transactions:read", "wallets:read", "agents:read"];

  function toggleScope(scope: string) {
    setScopes((s) => s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api.createApiKey({ name, scopes });
      onCreated(r.key);
      setName("");
      setScopes(["transactions:write"]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create API key">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Name (e.g. "Support Bot — prod")</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Scopes</label>
          <div className="space-y-1">
            {ALL_SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} />
                <code className="text-xs">{s}</code>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating..." : "Create key"}
        </button>
      </form>
    </Modal>
  );
}
