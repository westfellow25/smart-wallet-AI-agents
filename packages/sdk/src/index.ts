/**
 * AgentVault JS/TS SDK
 *
 * Дай своему AI-агенту тратить деньги — но под контролем политик.
 *
 *   import { AgentVault } from "@agentvault/sdk";
 *   const vault = new AgentVault({ apiKey: process.env.AGENTVAULT_KEY! });
 *   const decision = await vault.spend({ amount: 15000, merchant: "Google Ads", category: "ads" });
 *   if (decision.approved) proceed();
 */

export type SpendStatus = "APPROVED" | "PENDING" | "BLOCKED" | "REJECTED";

export interface SpendInput {
  /** Сумма в центах (1500 = $15.00). */
  amount: number;
  /** Кому платим: "Google Ads", "OpenAI API", ... */
  merchant: string;
  /** Категория траты: "ads" | "api" | "saas" | "compute" | ... */
  category: string;
}

export interface SpendDecision {
  id: string;
  status: SpendStatus;
  reason: string | null;
  /** true только при APPROVED — деньги списаны, можно выполнять действие. */
  approved: boolean;
  /** true при PENDING — ждёт ручного одобрения. */
  pending: boolean;
  /** true при BLOCKED/REJECTED — нарушена политика. */
  blocked: boolean;
  /** Сырой объект транзакции из API. */
  raw: Record<string, unknown>;
}

export interface AgentVaultOptions {
  /** API-ключ агента (av_...), выданный при создании агента. */
  apiKey: string;
  /** Базовый URL API. По умолчанию http://localhost:4000 */
  baseUrl?: string;
  /** Таймаут запроса в мс (по умолчанию 10000). */
  timeoutMs?: number;
}

export class AgentVaultError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AgentVaultError";
  }
}

export class AgentVault {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: AgentVaultOptions) {
    if (!opts.apiKey) throw new AgentVaultError("apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "http://localhost:4000").replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  /**
   * Запросить трату. Возвращает решение policy engine.
   * Не бросает исключение на BLOCKED/PENDING — это нормальные исходы.
   */
  async spend(input: SpendInput): Promise<SpendDecision> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (e) {
      throw new AgentVaultError(`Network error: ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.status === 401 || res.status === 403) {
      throw new AgentVaultError(String(data.error ?? "Unauthorized"), res.status);
    }
    if (!("status" in data)) {
      throw new AgentVaultError(String(data.error ?? "Unexpected response"), res.status);
    }

    const status = data.status as SpendStatus;
    return {
      id: String(data.id),
      status,
      reason: (data.reason as string | null) ?? null,
      approved: status === "APPROVED",
      pending: status === "PENDING",
      blocked: status === "BLOCKED" || status === "REJECTED",
      raw: data,
    };
  }

  /**
   * Удобный guard: выполняет действие ТОЛЬКО если трата одобрена.
   * Если BLOCKED/PENDING — действие не выполняется, возвращается решение.
   */
  async spendThen<T>(
    input: SpendInput,
    action: () => Promise<T> | T
  ): Promise<{ decision: SpendDecision; result: T | null }> {
    const decision = await this.spend(input);
    const result = decision.approved ? await action() : null;
    return { decision, result };
  }
}

export default AgentVault;
