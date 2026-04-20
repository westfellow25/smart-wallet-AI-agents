"use client";

import { useEffect, useState } from "react";
import { api, Wallet } from "@/lib/api";
import { Modal } from "@/components/Modal";

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [depositFor, setDepositFor] = useState<Wallet | null>(null);

  async function load() {
    setLoading(true);
    const r = await api.listWallets();
    setWallets(r.wallets);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallets</h1>
          <p className="text-sm text-gray-500">Manage budgets and funds for your agents</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700"
        >
          + New wallet
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Balance</th>
              <th className="px-5 py-3">Monthly budget</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && wallets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No wallets yet
                </td>
              </tr>
            )}
            {wallets.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{w.name}</td>
                <td className="px-5 py-3 text-gray-600">{w.type}</td>
                <td className="px-5 py-3 font-semibold">${Number(w.balance).toFixed(2)}</td>
                <td className="px-5 py-3 text-gray-600">
                  {w.monthlyBudget ? `$${Number(w.monthlyBudget).toFixed(2)}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {w.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => setDepositFor(w)}
                    className="text-xs font-medium text-vault-600 hover:text-vault-700"
                  >
                    Deposit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateWalletModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />

      <DepositModal
        wallet={depositFor}
        onClose={() => setDepositFor(null)}
        onDone={() => {
          setDepositFor(null);
          load();
        }}
      />
    </div>
  );
}

function CreateWalletModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    type: "AGENT" as "MASTER" | "AGENT" | "DEPARTMENT",
    monthlyBudget: "",
    dailyLimit: "",
    perTxLimit: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createWallet({
        name: form.name,
        type: form.type,
        monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : undefined,
        dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : undefined,
        perTxLimit: form.perTxLimit ? Number(form.perTxLimit) : undefined,
      } as Partial<Wallet>);
      onCreated();
      setForm({ name: "", type: "AGENT", monthlyBudget: "", dailyLimit: "", perTxLimit: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create wallet">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="input"
          />
        </Field>
        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "MASTER" | "AGENT" | "DEPARTMENT" })}
            className="input"
          >
            <option value="AGENT">Agent</option>
            <option value="DEPARTMENT">Department</option>
            <option value="MASTER">Master</option>
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Monthly">
            <input type="number" step="0.01" value={form.monthlyBudget} onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })} className="input" />
          </Field>
          <Field label="Daily">
            <input type="number" step="0.01" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} className="input" />
          </Field>
          <Field label="Per tx">
            <input type="number" step="0.01" value={form.perTxLimit} onChange={(e) => setForm({ ...form, perTxLimit: e.target.value })} className="input" />
          </Field>
        </div>

        {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </Modal>
  );
}

function DepositModal({ wallet, onClose, onDone }: { wallet: Wallet | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet) return;
    setLoading(true);
    setError("");
    try {
      await api.depositWallet(wallet.id, Number(amount));
      setAmount("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={!!wallet} onClose={onClose} title={`Deposit to ${wallet?.name || ""}`}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Amount">
          <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input" />
        </Field>
        {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Processing..." : "Deposit"}
        </button>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
