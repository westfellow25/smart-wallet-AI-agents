// Проверка хеширования API-ключей.
import { generateApiKey, hashApiKey } from "../src/lib/apiKeys";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  cond ? pass++ : fail++;
}

const key = generateApiKey();
check("ключ с префиксом av_", key.startsWith("av_"));
check("хеш не равен ключу", hashApiKey(key) !== key);
check("хеш детерминирован", hashApiKey(key) === hashApiKey(key));
check("разные ключи -> разные хеши", hashApiKey(generateApiKey()) !== hashApiKey(generateApiKey()));
check("sha256 длиной 64 hex", /^[0-9a-f]{64}$/.test(hashApiKey(key)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
