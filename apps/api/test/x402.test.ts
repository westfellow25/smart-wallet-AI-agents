// Проверка квитанций x402 (подпись/верификация, без БД).
import { signReceipt, verifyReceipt } from "../src/lib/x402";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  cond ? pass++ : fail++;
}

const receipt = signReceipt({
  transferId: "tr1",
  resource: "/v1/x402/protected",
  amount: 500,
  payer: "a1",
  payee: "a2",
});

const ok = verifyReceipt(receipt);
check("валидная квитанция декодируется", ok?.resource === "/v1/x402/protected" && ok?.amount === 500);
check("плательщик/получатель сохранены", ok?.payer === "a1" && ok?.payee === "a2");
check("подделанная квитанция -> null", verifyReceipt(receipt + "tamper") === null);
check("мусор -> null", verifyReceipt("not-a-jwt") === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
