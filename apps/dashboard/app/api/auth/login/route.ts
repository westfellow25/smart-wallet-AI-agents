import { NextResponse } from "next/server";
import { API_URL, TOKEN_COOKIE } from "@/lib/api";

// POST /api/auth/login — проксирует на API, кладёт JWT в httpOnly-cookie.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${API_URL}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "Login failed" }, { status: res.status });
    }
    const out = NextResponse.json({ user: data.user });
    out.cookies.set(TOKEN_COOKIE, data.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return out;
  } catch {
    return NextResponse.json({ error: "API unreachable" }, { status: 502 });
  }
}
