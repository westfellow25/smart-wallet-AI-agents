import { NextResponse } from "next/server";
import { checkout, isConfigured } from "@/lib/api";

export async function POST(req: Request) {
  const { plan } = await req.json().catch(() => ({ plan: null }));
  if (!plan) {
    return NextResponse.json({ error: "plan is required" }, { status: 400 });
  }
  if (!isConfigured()) {
    // demo-режим: имитируем мгновенный апгрейд.
    return NextResponse.json({ devMode: true, plan, status: "ACTIVE" });
  }
  try {
    const result = await checkout(plan);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
