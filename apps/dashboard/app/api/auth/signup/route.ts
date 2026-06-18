import { NextResponse } from "next/server";
import { API_URL, TOKEN_COOKIE } from "@/lib/api";

// POST /api/auth/signup — создаёт аккаунт+организацию, кладёт JWT в cookie.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${API_URL}/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        typeof data.error === "string" ? data.error : "Signup failed (проверь email/пароль)";
      return NextResponse.json({ error: msg }, { status: res.status });
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
