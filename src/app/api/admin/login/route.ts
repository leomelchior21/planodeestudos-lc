import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signIn, checkOrigin } from "@/lib/admin-auth";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  if (!checkOrigin(request))
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403 },
    );
  const key = request.headers.get("x-forwarded-for") ?? "local";
  const old = attempts.get(key);
  if (old && old.until > Date.now() && old.count >= 10)
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 },
    );
  const body = await request.json();
  if (typeof body.password === "string" && (await signIn(body.password))) {
    attempts.delete(key);
    return NextResponse.json({ ok: true });
  }
  attempts.set(key, {
    count: old && old.until > Date.now() ? old.count + 1 : 1,
    until: Date.now() + 900000,
  });
  return NextResponse.json(
    { error: "Senha incorreta ou ADMIN_PASSWORD não configurada." },
    { status: 401 },
  );
}
export async function DELETE(request: Request) {
  if (!checkOrigin(request))
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403 },
    );
  (await cookies()).delete("study-admin");
  return NextResponse.json({ ok: true });
}
