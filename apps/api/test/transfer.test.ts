// Проверка guard-условий движка переводов (срабатывают до обращения к БД).
import { createTransfer, TransferError } from "../src/lib/transferEngine";

let pass = 0;
let fail = 0;

async function expectError(label: string, fn: () => Promise<unknown>, status: number) {
  try {
    await fn();
    console.log(`FAIL  ${label} -> не бросил ошибку`);
    fail++;
  } catch (e) {
    const ok = e instanceof TransferError && e.httpStatus === status;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : ` -> ${(e as Error).message}`}`);
    ok ? pass++ : fail++;
  }
}

async function main() {
  const from = { id: "a1", orgId: "o1" };

  await expectError(
    "перевод самому себе -> 400",
    () => createTransfer({ fromAgent: from, toAgentId: "a1", amount: 1000 }),
    400
  );
  await expectError(
    "нулевая сумма -> 400",
    () => createTransfer({ fromAgent: from, toAgentId: "a2", amount: 0 }),
    400
  );
  await expectError(
    "отрицательная сумма -> 400",
    () => createTransfer({ fromAgent: from, toAgentId: "a2", amount: -500 }),
    400
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
