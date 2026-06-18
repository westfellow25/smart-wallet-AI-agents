import jwt from "jsonwebtoken";

// x402 — оплата "на лету" по HTTP 402. Когда агент платит за ресурс,
// он получает подписанную квитанцию (receipt); сервер ресурса проверяет её
// и отдаёт контент. Квитанция = короткоживущий JWT, подписанный JWT_SECRET.

const SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

export type Receipt = {
  transferId: string;
  resource: string;
  amount: number; // в центах
  payer: string; // agentId плательщика
  payee: string; // agentId получателя
};

export function signReceipt(r: Receipt): string {
  return jwt.sign({ ...r, typ: "x402" }, SECRET, { expiresIn: "1h" });
}

export function verifyReceipt(token: string): (Receipt & { typ: string }) | null {
  try {
    const payload = jwt.verify(token, SECRET) as Receipt & { typ?: string };
    return payload.typ === "x402" ? (payload as Receipt & { typ: string }) : null;
  } catch {
    return null;
  }
}
