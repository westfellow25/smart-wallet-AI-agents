import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateApiKey(environment: "live" | "test" = "live"): {
  key: string;
  prefix: string;
  hash: Promise<string>;
} {
  const random = crypto.randomBytes(24).toString("base64url");
  const key = `av_${environment}_${random}`;
  const prefix = key.slice(0, 14);
  const hash = bcrypt.hash(key, 10);

  return { key, prefix, hash };
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}
