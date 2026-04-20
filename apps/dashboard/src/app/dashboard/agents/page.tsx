"use client";

import { useEffect, useState } from "react";
import { api, Agent, Wallet } from "@/lib/api";
import { Modal } from "@/components/Modal";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    const [a, w] = await Promise.all([api.listAgents(), api.listWallets()]);
    setAgents(a.agents);
    setWallets(w.wallets);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(a: Agent) {
    const next = a.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await api.updateAgent(a.id, { status: next } as Partial<Agent>);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-gray-500">Register and manage your AI agents</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700">
          + New agent
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Wallet</th>
              <th className="px-5 py-3">Transactions</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && agents.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No agents yet</td></tr>
            )}
            {agents.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{a.name}</td>
                <td className="px-5 py-3 text-gray-600">{a.type}</td>
                <td className="px-5 py-3 text-gray-600">{a.wallet?.name || "—"}</td>
                <td className="px-5 py-3 text-gray-600">{a._count?.transactions ?? 0}</td>
                <td className="px-5 py-3">
                  <span className={`pill ${a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : a.status === "PAUSED" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => toggleStatus(a)} className="text-xs font-medium text-vault-600 hover:text-vault-700">
                    {a.status === "ACTIVE" ? "Pause" : "Resume"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateAgentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        wallets={wallets}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </div>
  );
}

function CreateAgentModal({ open, onClose, wallets, onCreated }: { open: boolean; onClose: () => void; wallets: Wallet[]; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", type: "custom", walletId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallets.length && !form.walletId) setForm((f) => ({ ...f, walletId: wallets[0].id }));
  }, [wallets, form.walletId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createAgent(form as Partial<Agent>);
      onCreated();
      setForm({ name: "", description: "", type: "custom", walletId: wallets[0]?.id || "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create agent">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
          <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
            <option value="customer-support">Customer Support</option>
            <option value="research">Research</option>
            <option value="coding">Coding</option>
            <option value="data">Data Pipeline</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Wallet</label>
          <select value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} required className="input">
            <option value="">Select wallet</option>
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating..." : "Create agent"}
        </button>
      </form>
    </Modal>
  );
}
