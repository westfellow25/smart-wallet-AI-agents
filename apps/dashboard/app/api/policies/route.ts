import { NextResponse } from "next/server";
import { fetchPolicies, createPolicy, isConfigured } from "@/lib/api";
import { demoPolicies } from "@/lib/demoData";

// GET /api/policies — список политик (demo-fallback).
export async function GET() {
  if (isConfigured()) {
    try {
      return NextResponse.json({ policies: await fetchPolicies(), source: "live" });
    } catch {
      /* демо ниже */
    }
  }
  return NextResponse.json({ policies: demoPolicies, source: "demo" });
}

// POST /api/policies — создать политику. Суммы приходят в центах.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const payload = {
    name,
    maxPerTransaction: num(body.maxPerTransaction),
    dailyLimit: num(body.dailyLimit),
    requireApprovalOver: num(body.requireApprovalOver),
    allowedCategories: Array.isArray(body.allowedCategories) ? body.allowedCategories : [],
  };
  if (!isConfigured()) {
    return NextResponse.json({ id: "pol-" + Date.now(), isActive: true, ...payload, source: "demo" });
  }
  try {
    return NextResponse.json(await createPolicy(payload), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
