import { NextResponse } from "next/server";
import { fetchTransfers, fetchPaymentRequests, isConfigured } from "@/lib/api";
import { demoTransfers, demoPaymentRequests } from "@/lib/demoData";

// GET /api/transfers — A2A-переводы + счета одним вызовом. Demo-fallback.
export async function GET() {
  if (isConfigured()) {
    try {
      const [transfers, paymentRequests] = await Promise.all([
        fetchTransfers(),
        fetchPaymentRequests(),
      ]);
      return NextResponse.json({ transfers, paymentRequests, source: "live" });
    } catch {
      /* демо ниже */
    }
  }
  return NextResponse.json({
    transfers: demoTransfers,
    paymentRequests: demoPaymentRequests,
    source: "demo",
  });
}
