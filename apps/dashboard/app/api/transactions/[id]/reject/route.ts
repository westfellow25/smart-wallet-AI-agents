import { NextResponse } from "next/server";
import { decideTransaction, isConfigured } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isConfigured()) {
    return NextResponse.json({ id, status: "REJECTED", source: "demo" });
  }
  try {
    const tx = await decideTransaction(id, "reject");
    return NextResponse.json(tx);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
