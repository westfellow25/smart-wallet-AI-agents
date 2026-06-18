import { NextResponse } from "next/server";
import { cancelPaymentRequest, isConfigured } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isConfigured()) {
    return NextResponse.json({ id, status: "CANCELED", source: "demo" });
  }
  try {
    return NextResponse.json(await cancelPaymentRequest(id));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
