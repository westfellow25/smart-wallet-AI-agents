import { NextResponse } from "next/server";
import { fetchPlans, fetchSubscription, isConfigured } from "@/lib/api";
import { demoPlans, demoSubscription } from "@/lib/demoData";

// GET /api/billing — тарифы + текущая подписка. Demo-fallback, если API офлайн.
export async function GET() {
  if (isConfigured()) {
    try {
      const [plans, subscription] = await Promise.all([
        fetchPlans(),
        fetchSubscription(),
      ]);
      return NextResponse.json({ plans, subscription, source: "live" });
    } catch {
      /* упадём в демо */
    }
  }
  return NextResponse.json({
    plans: demoPlans,
    subscription: demoSubscription,
    source: "demo",
  });
}
