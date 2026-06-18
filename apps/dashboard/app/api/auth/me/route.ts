import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL, TOKEN_COOKIE } from "@/lib/api";

// GET /api/auth/me — текущий пользователь (или null, если не вошёл).
export async function GET() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  try {
    const res = await fetch(`${API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ user: null });
    const data = await res.json();
    return NextResponse.json({ user: data.user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
