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
