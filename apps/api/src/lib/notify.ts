// Уведомления о событиях, требующих внимания человека (pending-одобрения).
// Если задан NOTIFY_WEBHOOK_URL (Slack incoming webhook или любой POST-приёмник)
// — шлём туда сообщение. Fire-and-forget: не блокируем ответ API.

type PendingEvent = {
  kind: "transaction" | "transfer";
  agentName: string;
  amount: number; // в центах
  to: string; // мерчант или агент-получатель
  reason: string | null;
};

export function notifyPending(ev: PendingEvent): void {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;

  const dollars = `$${(ev.amount / 100).toFixed(2)}`;
  const text =
    ev.kind === "transfer"
      ? `⏸ AgentVault: перевод ${dollars} (${ev.agentName} → ${ev.to}) ждёт одобрения. ${ev.reason ?? ""}`
      : `⏸ AgentVault: трата ${dollars} (${ev.agentName} → ${ev.to}) ждёт одобрения. ${ev.reason ?? ""}`;

  // Slack-совместимый payload ({text}); не ждём ответа и глушим ошибки.
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).catch(() => {});
}
