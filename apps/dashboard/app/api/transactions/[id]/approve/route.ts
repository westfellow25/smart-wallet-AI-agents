import { NextResponse } from "next/server";
import { decideTransaction, isConfigured } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await isConfigured())) {
    // demo-режим: просто подтверждаем оптимистично
    return NextResponse.json({ id, status: "APPROVED", source: "demo" });
  }
  try {
    const tx = await decideTransaction(id, "approve");
    return NextResponse.json(tx);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
