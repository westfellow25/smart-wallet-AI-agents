"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vault-600 text-lg font-bold text-white">
            AV
          </div>
          <span className="text-2xl font-bold">AgentVault</span>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold">Create account</h1>
          <p className="mb-6 text-sm text-gray-500">14-day free trial, no card required</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Company name</label>
              <input
                type="text"
                value={form.organizationName}
                onChange={(e) => update("organizationName", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Your name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Work email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-100"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 8 characters</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-vault-600 py-2.5 text-sm font-medium text-white hover:bg-vault-700 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-vault-600 hover:text-vault-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
