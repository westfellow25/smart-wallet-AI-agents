import { createHash, randomBytes } from "node:crypto";

// API-ключи агентов — высокоэнтропийные токены. Храним только sha256-хеш
// (детерминированный, чтобы искать по нему); сам ключ показываем один раз.

export function generateApiKey(): string {
  return "av_" + randomBytes(24).toString("hex");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
