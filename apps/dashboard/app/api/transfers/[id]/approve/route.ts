import { NextResponse } from "next/server";
import { decideTransfer, isConfigured } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isConfigured()) {
    return NextResponse.json({ id, status: "APPROVED", source: "demo" });
  }
  try {
    return NextResponse.json(await decideTransfer(id, "approve"));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
