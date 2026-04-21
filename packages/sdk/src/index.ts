/**
 * AgentVault SDK — TypeScript client for AI agents to manage wallets & transactions.
 *
 * Usage:
 *   import { AgentVault } from "@agentvault/sdk";
 *   const vault = new AgentVault({ apiKey: "av_live_..." });
 *   const tx = await vault.spend({ amount: 5.00, category: "api-call" });
 */

export interface AgentVaultConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface SpendParams {
  amount: number;
  agentId?: string;
  category?: string;
  description?: string;
  merchantName?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "BLOCKED" | "FAILED";
  category?: string;
  description?: string;
  createdAt: string;
}

export interface WalletInfo {
  id: string;
  name: string;
  balance: number;
  currency: string;
  status: string;
}

export class AgentVault {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AgentVaultConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.agentvault.dev";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new AgentVaultError(
        res.status,
        (body as Record<string, string>).error || `HTTP ${res.status}`,
      );
    }

    return res.json() as Promise<T>;
  }

  /** Submit a spend request. Returns transaction (may be pending approval). */
  async spend(params: SpendParams): Promise<{ transaction: Transaction }> {
    return this.request("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /** Check balance of the agent's wallet. */
  async getBalance(): Promise<{ wallet: WalletInfo }> {
    return this.request("/api/v1/wallets/me");
  }

  /** List recent transactions for this agent. */
  async listTransactions(limit = 20): Promise<{ transactions: Transaction[]; total: number }> {
    return this.request(`/api/v1/transactions?limit=${limit}`);
  }

  /** Get a specific transaction by ID. */
  async getTransaction(id: string): Promise<{ transaction: Transaction }> {
    return this.request(`/api/v1/transactions/${id}`);
  }
}

export class AgentVaultError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AgentVaultError";
  }
}

export default AgentVault;
