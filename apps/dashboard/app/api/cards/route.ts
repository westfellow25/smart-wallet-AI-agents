import { NextResponse } from "next/server";
import { fetchCards, issueCard, isConfigured } from "@/lib/api";
import { demoCards } from "@/lib/demoData";

// GET /api/cards — виртуальные карты. Demo-fallback при офлайн-API.
export async function GET() {
  if (await isConfigured()) {
    try {
      const cards = await fetchCards();
      return NextResponse.json({ cards, source: "live" });
    } catch {
      /* демо ниже */
    }
  }
  return NextResponse.json({ cards: demoCards, source: "demo" });
}

// POST /api/cards — выпустить карту агенту.
export async function POST(req: Request) {
  const { agentId } = await req.json().catch(() => ({ agentId: null }));
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }
  if (!(await isConfigured())) {
    return NextResponse.json({
      id: "card-" + Date.now(),
      agentId,
      network: "USDC_BASE",
      last4: String(1000 + Math.floor(Math.random() * 8999)),
      status: "ACTIVE",
      source: "demo",
    });
  }
  try {
    return NextResponse.json(await issueCard(agentId), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
