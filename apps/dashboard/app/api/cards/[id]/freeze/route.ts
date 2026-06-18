import { NextResponse } from "next/server";
import { setCardStatus, isConfigured } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isConfigured()) {
    return NextResponse.json({ id, status: "FROZEN", source: "demo" });
  }
  try {
    return NextResponse.json(await setCardStatus(id, "freeze"));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
