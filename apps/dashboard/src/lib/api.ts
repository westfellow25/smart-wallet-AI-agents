const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TOKEN_KEY = "agentvault.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { error?: string }).error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User; organization: Organization }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; name: string; organizationName: string }) =>
    apiFetch<{ token: string; user: User; organization: Organization }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => apiFetch<{ user: User; organization: Organization }>("/api/v1/auth/me"),

  // Analytics
  overview: () => apiFetch<Overview>("/api/v1/analytics/overview"),
  daily: (days = 7) => apiFetch<{ daily: DailyPoint[] }>(`/api/v1/analytics/daily?days=${days}`),
  byCategory: () => apiFetch<{ categories: CategoryStat[] }>("/api/v1/analytics/by-category"),
  byAgent: () => apiFetch<{ byAgent: AgentStat[] }>("/api/v1/analytics/by-agent"),

  // Wallets
  listWallets: () => apiFetch<{ wallets: Wallet[] }>("/api/v1/wallets"),
  getWallet: (id: string) => apiFetch<{ wallet: Wallet }>(`/api/v1/wallets/${id}`),
  createWallet: (data: Partial<Wallet>) =>
    apiFetch<{ wallet: Wallet }>("/api/v1/wallets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateWallet: (id: string, data: Partial<Wallet>) =>
    apiFetch<{ wallet: Wallet }>(`/api/v1/wallets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  depositWallet: (id: string, amount: number) =>
    apiFetch<{ wallet: Wallet }>(`/api/v1/wallets/${id}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  // Agents
  listAgents: () => apiFetch<{ agents: Agent[] }>("/api/v1/agents"),
  getAgent: (id: string) => apiFetch<{ agent: Agent }>(`/api/v1/agents/${id}`),
  createAgent: (data: Partial<Agent>) =>
    apiFetch<{ agent: Agent }>("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAgent: (id: string, data: Partial<Agent>) =>
    apiFetch<{ agent: Agent }>(`/api/v1/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  attachPolicy: (agentId: string, policyId: string) =>
    apiFetch(`/api/v1/agents/${agentId}/policies`, {
      method: "POST",
      body: JSON.stringify({ policyId }),
    }),

  // Transactions
  listTransactions: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch<{ transactions: Transaction[]; total: number }>(
      `/api/v1/transactions${q ? `?${q}` : ""}`,
    );
  },
  reviewTransaction: (id: string, action: "approve" | "reject", note?: string) =>
    apiFetch<{ transaction: Transaction }>(`/api/v1/transactions/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    }),

  // Policies
  listPolicies: () => apiFetch<{ policies: Policy[] }>("/api/v1/policies"),
  createPolicy: (data: Partial<Policy>) =>
    apiFetch<{ policy: Policy }>("/api/v1/policies", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deletePolicy: (id: string) =>
    apiFetch(`/api/v1/policies/${id}`, { method: "DELETE" }),

  // API Keys
  listApiKeys: () => apiFetch<{ apiKeys: ApiKey[] }>("/api/v1/api-keys"),
  createApiKey: (data: { name: string; scopes?: string[]; agentId?: string }) =>
    apiFetch<{ apiKey: ApiKey; key: string }>("/api/v1/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revokeApiKey: (id: string) =>
    apiFetch(`/api/v1/api-keys/${id}/revoke`, { method: "POST" }),

  // Billing
  plans: () => apiFetch<{ plans: Record<string, Plan> }>("/api/v1/billing/plans"),
  subscription: () => apiFetch<Subscription>("/api/v1/billing/subscription"),
  checkout: (plan: string) =>
    apiFetch<{ checkoutUrl?: string; mode?: string }>("/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
};

// ─── Types ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan?: string;
}

export interface Overview {
  totalSpent: number;
  spendChange: number;
  activeAgents: number;
  totalTransactions: number;
  blockedCount: number;
  pendingCount: number;
  budgetUsedPct: number;
  walletBalance: number;
}

export interface DailyPoint {
  day: string;
  total: number;
  count: number;
}

export interface CategoryStat {
  category: string;
  total: number;
  count: number;
}

export interface AgentStat {
  agentId: string;
  agentName: string;
  agentType: string;
  total: number;
  count: number;
}

export interface Wallet {
  id: string;
  name: string;
  type: "MASTER" | "AGENT" | "DEPARTMENT";
  currency: string;
  balance: number | string;
  monthlyBudget?: number | string | null;
  dailyLimit?: number | string | null;
  perTxLimit?: number | string | null;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  _count?: { agents: number; transactions: number };
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: "ACTIVE" | "PAUSED" | "REVOKED";
  walletId: string;
  wallet?: { id: string; name: string; balance: number | string };
  _count?: { transactions: number };
  metadata?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  amount: number | string;
  type: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "BLOCKED" | "FAILED";
  category?: string;
  description?: string;
  merchantName?: string;
  agentId: string;
  agent?: { id: string; name: string; type: string };
  wallet?: { id: string; name: string };
  createdAt: string;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  action: "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL" | "FLAG";
  rules: {
    maxAmount?: number;
    allowedCategories?: string[];
    blockedCategories?: string[];
    maxDailySpend?: number;
    maxMonthlySpend?: number;
  };
  _count?: { agents: number };
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  agentId?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface Plan {
  name: string;
  price: number;
  agents: number;
  transactions: number;
}

export interface Subscription {
  subscription: {
    plan: string;
    subscriptionStatus?: string;
    trialEndsAt?: string;
  };
  planDetails: Plan;
}
