import { NextResponse } from "next/server";
import { fetchAgents, createAgent, isConfigured } from "@/lib/api";
import { demoAgents } from "@/lib/demoData";

// GET /api/agents — список агентов (demo-fallback).
export async function GET() {
  if (await isConfigured()) {
    try {
      return NextResponse.json({ agents: await fetchAgents(), source: "live" });
    } catch {
      /* демо ниже */
    }
  }
  return NextResponse.json({ agents: demoAgents, source: "demo" });
}

// POST /api/agents — создать агента.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const startingBalance = Math.max(0, Math.round(Number(body.startingBalance) || 0));
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!(await isConfigured())) {
    // demo: возвращаем правдоподобного агента с одноразовым ключом.
    const key = "av_demo_" + Math.random().toString(16).slice(2, 18);
    return NextResponse.json({
      id: "demo-" + Date.now(),
      name,
      apiKey: key,
      status: "ACTIVE",
      wallet: { balance: startingBalance, dailySpent: 0, currency: "USD" },
      source: "demo",
    });
  }
  try {
    return NextResponse.json(await createAgent({ name, startingBalance }), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
