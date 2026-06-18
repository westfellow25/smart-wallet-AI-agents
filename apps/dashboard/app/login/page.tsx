"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { email, password, name, orgName } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось войти");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 6 }}>
          <div className="logo">AV</div>
          <strong style={{ fontSize: 20 }}>AgentVault</strong>
        </div>
        <p className="auth-sub">
          {mode === "login" ? "Войдите в свою организацию" : "Создайте организацию"}
        </p>

        <form className="form" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Arman" />
              </label>
              <label>
                Organization
                <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme AI" />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 chars" required />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="form-btn" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>Нет аккаунта? <button onClick={() => setMode("signup")}>Создать</button></>
          ) : (
            <>Уже есть аккаунт? <button onClick={() => setMode("login")}>Войти</button></>
          )}
        </div>

        <div className="auth-demo">
          <Link href="/dashboard">→ Посмотреть демо без входа</Link>
        </div>
      </div>
    </div>
  );
}
