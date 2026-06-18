// Серверный клиент к AgentVault API. Используется в Next route handlers.
// Если API недоступен или не задан ORG_ID — отдаём демо-данные,
// чтобы дашборд всегда рендерился.

const API_URL = process.env.AGENTVAULT_API_URL ?? "http://localhost:4000";
const ORG_ID = process.env.AGENTVAULT_ORG_ID ?? "";

export function isConfigured(): boolean {
  return Boolean(ORG_ID);
}

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-org-id": ORG_ID,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function fetchTransactions() {
  const res = await apiFetch("/v1/transactions");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchAgents() {
  const res = await apiFetch("/v1/agents");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function decideTransaction(
  id: string,
  action: "approve" | "reject"
) {
  const res = await apiFetch(`/v1/transactions/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify({ decidedBy: "dashboard" }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchPlans() {
  // /plans статичен и не требует org — берём напрямую.
  const res = await fetch(`${API_URL}/v1/billing/plans`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchSubscription() {
  const res = await apiFetch("/v1/billing/subscription");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function checkout(plan: string) {
  const res = await apiFetch("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchCards() {
  const res = await apiFetch("/v1/cards");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchAnomalies() {
  const res = await apiFetch("/v1/anomalies");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function createAgent(body: {
  name: string;
  startingBalance: number;
}) {
  const res = await apiFetch("/v1/agents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function issueCard(agentId: string) {
  const res = await apiFetch("/v1/cards", {
    method: "POST",
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchPolicies() {
  const res = await apiFetch("/v1/policies");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function createPolicy(body: Record<string, unknown>) {
  const res = await apiFetch("/v1/policies", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchTransfers() {
  const res = await apiFetch("/v1/transfers");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function decideTransfer(id: string, action: "approve" | "reject") {
  const res = await apiFetch(`/v1/transfers/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify({ decidedBy: "dashboard" }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchPaymentRequests() {
  const res = await apiFetch("/v1/payment-requests");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function cancelPaymentRequest(id: string) {
  const res = await apiFetch(`/v1/payment-requests/${id}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function setCardStatus(id: string, action: "freeze" | "unfreeze") {
  const res = await apiFetch(`/v1/cards/${id}/${action}`, { method: "POST" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
