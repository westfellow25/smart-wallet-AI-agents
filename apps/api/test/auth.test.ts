// Проверка примитивов аутентификации (без БД).
import { hashPassword, verifyPassword, signToken, verifyToken } from "../src/lib/auth";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  cond ? pass++ : fail++;
}

async function main() {
  const hash = await hashPassword("demodemo");
  check("хеш не равен паролю", hash !== "demodemo");
  check("верный пароль проходит", await verifyPassword("demodemo", hash));
  check("неверный пароль отклоняется", !(await verifyPassword("wrong", hash)));

  const token = signToken({ userId: "u1", orgId: "o1", role: "OWNER" });
  const payload = verifyToken(token);
  check("JWT декодируется", payload?.orgId === "o1" && payload?.userId === "u1");
  check("битый JWT -> null", verifyToken(token + "x") === null);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
