// Прогон детектора аномалий. Запуск: npm run test:anomaly
import { detectAnomalies, type AnomalyTx } from "../src/lib/anomaly";

const now = Date.now();
const ago = (m: number) => new Date(now - m * 60_000).toISOString();

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  cond ? pass++ : fail++;
}

// Сценарий 1: агент с 3 блокировками за 30 мин -> HIGH.
const blocked: AnomalyTx[] = [1, 2, 3].map((i) => ({
  id: `b${i}`, agentId: "a1", amount: 60000, merchant: "X", category: "ads",
  status: "BLOCKED", createdAt: ago(i * 5), agent: { name: "Bad Bot" },
}));
const r1 = detectAnomalies(blocked, now);
check("повторные блокировки -> HIGH", r1.some((a) => a.severity === "HIGH"));

// Сценарий 2: всплеск частоты — 6 транзакций за 10 мин -> есть аномалия.
const burst: AnomalyTx[] = [1, 2, 3, 4, 5, 6].map((i) => ({
  id: `v${i}`, agentId: "a2", amount: 1000, merchant: "API", category: "api",
  status: "APPROVED", createdAt: ago(i), agent: { name: "Busy Bot" },
}));
const r2 = detectAnomalies(burst, now);
check("всплеск частоты -> MEDIUM", r2.some((a) => a.id.startsWith("vel-")));

// Сценарий 3: спокойный агент -> ноль аномалий.
const calm: AnomalyTx[] = [{
  id: "c1", agentId: "a3", amount: 1000, merchant: "Notion", category: "saas",
  status: "APPROVED", createdAt: ago(120), agent: { name: "Calm Bot" },
}];
check("спокойный агент -> нет аномалий", detectAnomalies(calm, now).length === 0);

// Сценарий 4: сортировка — HIGH идёт раньше MEDIUM.
const mixed = [...burst, ...blocked];
const r4 = detectAnomalies(mixed, now);
check("HIGH раньше MEDIUM", r4.length >= 2 && r4[0].severity === "HIGH");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
