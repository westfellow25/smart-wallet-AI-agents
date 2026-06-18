// Детектор аномалий трат. Эвристики (без ML) поверх недавних транзакций
// организации — то, что в реальном инциденте важно заметить первым:
// скомпрометированный агент, всплеск частоты, выброс по сумме.

export type AnomalyTx = {
  id: string;
  agentId: string;
  amount: number; // в центах
  merchant: string;
  category: string;
  status: "APPROVED" | "PENDING" | "BLOCKED" | "REJECTED";
  createdAt: string | Date;
  agent?: { name: string } | null;
};

export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type Anomaly = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  agentName: string;
  at: string;
};

const MIN = 60 * 1000;

function ms(d: string | Date): number {
  return new Date(d).getTime();
}

export function detectAnomalies(txs: AnomalyTx[], now = Date.now()): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const byAgent = new Map<string, AnomalyTx[]>();
  for (const t of txs) {
    const list = byAgent.get(t.agentId) ?? [];
    list.push(t);
    byAgent.set(t.agentId, list);
  }

  for (const [agentId, list] of byAgent) {
    const name = list[0]?.agent?.name ?? "agent";
    const sorted = [...list].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));

    // 1. Повторные блокировки за 30 мин — возможный взлом / prompt-injection.
    const recentBlocked = sorted.filter(
      (t) => t.status === "BLOCKED" && now - ms(t.createdAt) < 30 * MIN
    );
    if (recentBlocked.length >= 2) {
      anomalies.push({
        id: `blk-${agentId}`,
        severity: "HIGH",
        title: "Повторные блокировки политикой",
        detail: `${recentBlocked.length} заблокированных трат за 30 мин — возможен скомпрометированный агент или prompt-injection`,
        agentName: name,
        at: new Date(ms(sorted[0].createdAt)).toISOString(),
      });
    }

    // 2. Всплеск частоты — 5+ транзакций за 10 мин.
    const recent = sorted.filter((t) => now - ms(t.createdAt) < 10 * MIN);
    if (recent.length >= 5) {
      anomalies.push({
        id: `vel-${agentId}`,
        severity: "MEDIUM",
        title: "Всплеск частоты трат",
        detail: `${recent.length} транзакций за 10 минут — нетипичная активность`,
        agentName: name,
        at: new Date(ms(recent[0].createdAt)).toISOString(),
      });
    }

    // 3. Выброс по сумме — одобренная трата заметно выше средней по агенту.
    const approved = sorted.filter((t) => t.status === "APPROVED");
    if (approved.length >= 3) {
      const avg = approved.reduce((s, t) => s + t.amount, 0) / approved.length;
      const top = approved.reduce((m, t) => (t.amount > m.amount ? t : m));
      if (avg > 0 && top.amount > avg * 3 && top.amount >= 20000) {
        anomalies.push({
          id: `amt-${top.id}`,
          severity: "MEDIUM",
          title: "Выброс по сумме",
          detail: `${dollars(top.amount)} на "${top.merchant}" — в ${(top.amount / avg).toFixed(1)}× выше средней траты агента`,
          agentName: name,
          at: new Date(ms(top.createdAt)).toISOString(),
        });
      }
    }
  }

  const order: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
