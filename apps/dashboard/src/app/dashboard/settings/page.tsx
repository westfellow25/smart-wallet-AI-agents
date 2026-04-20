"use client";

import { useEffect, useState } from "react";
import { api, Plan, Subscription } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user, organization } = useAuth();
  const [plans, setPlans] = useState<Record<string, Plan> | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans));
    api.subscription().then(setSubscription);
  }, []);

  async function upgrade(plan: string) {
    if (!confirm(`Switch to ${plan} plan?`)) return;
    setLoading(true);
    try {
      const r = await api.checkout(plan);
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else {
        alert("Plan updated (dev mode).");
        const fresh = await api.subscription();
        setSubscription(fresh);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Organization</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium">{organization?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Slug</dt>
            <dd className="font-mono text-xs">{organization?.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Your email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Your role</dt>
            <dd className="font-medium">{user?.role}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Billing</h2>
          {subscription && (
            <span className="pill bg-vault-100 text-vault-700">
              Current: {subscription.planDetails.name} — ${subscription.planDetails.price}/mo
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {plans && Object.entries(plans).map(([key, plan]) => {
            const active = subscription?.subscription.plan === key;
            return (
              <div key={key} className={`rounded-xl border p-4 ${active ? "border-vault-600 bg-vault-50" : ""}`}>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold">${plan.price}<span className="text-xs font-normal text-gray-500">/mo</span></p>
                <ul className="mt-3 space-y-1 text-xs text-gray-600">
                  <li>{plan.agents === -1 ? "Unlimited" : plan.agents} agents</li>
                  <li>{plan.transactions === -1 ? "Unlimited" : `${plan.transactions.toLocaleString()}/mo`} tx</li>
                </ul>
                <button
                  onClick={() => upgrade(key)}
                  disabled={loading || active}
                  className={`mt-4 w-full rounded-lg py-1.5 text-xs font-medium ${
                    active ? "bg-gray-100 text-gray-400" : "bg-vault-600 text-white hover:bg-vault-700"
                  }`}
                >
                  {active ? "Current plan" : "Switch"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
