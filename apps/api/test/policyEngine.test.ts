// Прогон policy engine по ключевым сценариям. Запуск: npm test
// (ts-node --transpile-only test/policyEngine.test.ts)
import { evaluate } from "../src/lib/policyEngine";

const policy = {
  id: "p1",
  orgId: "o1",
  name: "Default",
  isActive: true,
  maxPerTransaction: 50000, // $500
  dailyLimit: 200000, // $2000
  requireApprovalOver: 20000, // $200
  allowedCategories: ["ads", "api", "saas"],
  createdAt: new Date(),
} as any;

let pass = 0;
let fail = 0;
function check(label: string, got: string, want: string) {
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} -> ${got}${ok ? "" : ` (want ${want})`}`);
  ok ? pass++ : fail++;
}

check("$150 ads, clean day", evaluate({ amount: 15000, category: "ads" }, [policy], { dailySpent: 0 }).status, "APPROVED");
check("$300 ads (> $200 approval)", evaluate({ amount: 30000, category: "ads" }, [policy], { dailySpent: 0 }).status, "PENDING");
check("$600 ads (> $500 per-tx)", evaluate({ amount: 60000, category: "ads" }, [policy], { dailySpent: 0 }).status, "BLOCKED");
check("$150 gambling (bad category)", evaluate({ amount: 15000, category: "gambling" }, [policy], { dailySpent: 0 }).status, "BLOCKED");
check("$150 ads but $1900 already spent", evaluate({ amount: 15000, category: "ads" }, [policy], { dailySpent: 190000 }).status, "BLOCKED");
check("$50 api, no policies", evaluate({ amount: 5000, category: "api" }, [], { dailySpent: 0 }).status, "APPROVED");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
