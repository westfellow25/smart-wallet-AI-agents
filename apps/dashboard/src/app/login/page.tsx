"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@acme.ai");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vault-600 text-lg font-bold text-white">
            AV
          </div>
          <span className="text-2xl font-bold">AgentVault</span>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
          <p className="mb-6 text-sm text-gray-500">Welcome back to AgentVault</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-100"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-vault-600 py-2.5 text-sm font-medium text-white hover:bg-vault-700 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-vault-600 hover:text-vault-700">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Demo: admin@acme.ai / demo1234
        </p>
      </div>
    </div>
  );
}
