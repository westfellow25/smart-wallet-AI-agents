"use client";

import { useEffect, useState } from "react";
import { api, apiFetch } from "@/lib/api";
import { Modal } from "@/components/Modal";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    const [wr, er] = await Promise.all([
      apiFetch<{ webhooks: Webhook[] }>("/api/v1/webhooks"),
      apiFetch<{ events: string[] }>("/api/v1/webhooks/events"),
    ]);
    setWebhooks(wr.webhooks);
    setEvents(er.events);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(w: Webhook) {
    await apiFetch(`/api/v1/webhooks/${w.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !w.enabled }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await apiFetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-gray-500">Receive real-time notifications on transaction events</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700">
          + New webhook
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">URL</th>
              <th className="px-5 py-3">Events</th>
              <th className="px-5 py-3">Enabled</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && webhooks.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No webhooks</td></tr>}
            {webhooks.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs">{w.url}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{w.events.length} events</td>
                <td className="px-5 py-3">
                  <button onClick={() => toggle(w)} className={`pill ${w.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                    {w.enabled ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove(w.id)} className="text-xs font-medium text-red-500 hover:text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateWebhookModal open={showCreate} onClose={() => setShowCreate(false)} events={events} onCreated={() => { setShowCreate(false); load(); }} />
    </div>
  );
}

function CreateWebhookModal({ open, onClose, events, onCreated }: { open: boolean; onClose: () => void; events: string[]; onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(ev: string) {
    setSelected((s) => s.includes(ev) ? s.filter((x) => x !== ev) : [...s, ev]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url, events: selected }),
      });
      onCreated();
      setUrl("");
      setSelected([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create webhook">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://your-app.com/webhooks/agentvault" className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Events</label>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {events.map((ev) => (
              <label key={ev} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(ev)} onChange={() => toggle(ev)} />
                <code className="text-xs">{ev}</code>
              </label>
            ))}
          </div>
        </div>

        {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}

        <button type="submit" disabled={loading || selected.length === 0} className="btn-primary">
          {loading ? "Creating..." : "Create webhook"}
        </button>
      </form>
    </Modal>
  );
}
