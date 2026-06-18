import { NextResponse } from "next/server";
import { fetchAnomalies, isConfigured } from "@/lib/api";
import { demoAnomalies } from "@/lib/demoData";

// GET /api/anomalies — аномалии трат. Demo-fallback при офлайн-API.
export async function GET() {
  if (isConfigured()) {
    try {
      const anomalies = await fetchAnomalies();
      return NextResponse.json({ anomalies, source: "live" });
    } catch {
      /* демо ниже */
    }
  }
  return NextResponse.json({ anomalies: demoAnomalies, source: "demo" });
}
