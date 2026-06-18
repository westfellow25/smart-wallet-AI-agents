import { NextResponse } from "next/server";
import { fetchCards, isConfigured } from "@/lib/api";
import { demoCards } from "@/lib/demoData";

// GET /api/cards — виртуальные карты. Demo-fallback при офлайн-API.
export async function GET() {
  if (isConfigured()) {
    try {
      const cards = await fetchCards();
      return NextResponse.json({ cards, source: "live" });
    } catch {
      /* демо ниже */
    }
  }
  return NextResponse.json({ cards: demoCards, source: "demo" });
}
