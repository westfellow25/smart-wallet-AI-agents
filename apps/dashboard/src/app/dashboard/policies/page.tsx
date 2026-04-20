"use client";

import { useEffect, useState } from "react";
import { api, Policy } from "@/lib/api";
import { Modal } from "@/components/Modal";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api.listPolicies();
    setPolicies(r.policies);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this policy?")) return;
    await api.deletePolicy(id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policies</h1>
          <p className="text-sm text-gray-500">Rules that control agent spending</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700">
          + New policy
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <div className="col-span-3 text-center text-gray-400">Loading...</div>}
        {!loading && policies.length === 0 && (
          <div className="col-span-3 rounded-xl border bg-white p-8 text-center text-gray-400">No policies yet</div>
        )}
        {policies.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              <span className={`pill ${
                p.action === "BLOCK" ? "bg-red-100 text-red-700" :
                p.action === "REQUIRE_APPROVAL" ? "bg-amber-100 text-amber-700" :
                p.action === "FLAG" ? "bg-blue-100 text-blue-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>
                {p.action}
              </span>
            </div>
            {p.description && <p className="mb-3 text-xs text-gray-500">{p.description}</p>}
            <div className="space-y-1 text-xs text-gray-600">
              {p.rules.maxAmount && <div>Max amount: <strong>${p.rules.maxAmount}</strong></div>}
              {p.rules.maxDailySpend && <div>Max daily: <strong>${p.rules.maxDailySpend}</strong></div>}
              {p.rules.allowedCategories?.length ? <div>Allowed: {p.rules.allowedCategories.join(", ")}</div> : null}
              {p.rules.blockedCategories?.length ? <div>Blocked: {p.rules.blockedCategories.join(", ")}</div> : null}
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="text-xs text-gray-500">{p._count?.agents ?? 0} agents</span>
              <button onClick={() => remove(p.id)} className="text-xs font-medium text-red-500 hover:text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <CreatePolicyModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
    </div>
  );
}

function CreatePolicyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    action: "BLOCK" as "BLOCK" | "REQUIRE_APPROVAL" | "FLAG" | "ALLOW",
    maxAmount: "",
    allowedCategories: "",
    blockedCategories: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const rules: Policy["rules"] = {};
      if (form.maxAmount) rules.maxAmount = Number(form.maxAmount);
      if (form.allowedCategories) rules.allowedCategories = form.allowedCategories.split(",").map((s) => s.trim()).filter(Boolean);
      if (form.blockedCategories) rules.blockedCategories = form.blockedCategories.split(",").map((s) => s.trim()).filter(Boolean);

      await api.createPolicy({
        name: form.name,
        description: form.description,
        action: form.action,
        rules,
      });
      onCreated();
      setForm({ name: "", description: "", action: "BLOCK", maxAmount: "", allowedCategories: "", blockedCategories: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create policy">
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
          <label className="mb-1 block text-xs font-medium text-gray-600">Action when triggered</label>
          <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as typeof form.action })} className="input">
            <option value="BLOCK">Block transaction</option>
            <option value="REQUIRE_APPROVAL">Require approval</option>
            <option value="FLAG">Flag for review</option>
            <option value="ALLOW">Allow (logging only)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Max amount per transaction ($)</label>
          <input type="number" step="0.01" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Allowed categories (comma-separated)</label>
          <input type="text" value={form.allowedCategories} onChange={(e) => setForm({ ...form, allowedCategories: e.target.value })} placeholder="api-call, cloud-compute" className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Blocked categories</label>
          <input type="text" value={form.blockedCategories} onChange={(e) => setForm({ ...form, blockedCategories: e.target.value })} className="input" />
        </div>

        {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating..." : "Create policy"}
        </button>
      </form>
    </Modal>
  );
}
