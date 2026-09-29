import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signIn, checkOrigin } from "@/lib/admin-auth";
const attempts = new Map<string, { count: number; until: number }>();
const maxAttempts = 10;
const windowMs = 900000;
function requestIsSecure(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}
export async function POST(request: Request) {
  if (!checkOrigin(request))
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403 },
    );
  if (!process.env.ADMIN_PASSWORD)
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD não configurada no servidor. Defina a variável e reinicie.",
      },
      { status: 503 },
    );
  const key = request.headers.get("x-forwarded-for") ?? "local";
  const old = attempts.get(key);
  const blocked = !!old && old.until > Date.now() && old.count >= maxAttempts;
  const body = await request.json();
  if (
    typeof body.password === "string" &&
    (await signIn(body.password, requestIsSecure(request)))
  ) {
    attempts.delete(key);
    return NextResponse.json({ ok: true });
  }
  if (blocked) {
    const minutes = Math.max(1, Math.ceil((old!.until - Date.now()) / 60000));
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${minutes} min.` },
      { status: 429 },
    );
  }
  attempts.set(key, {
    count: old && old.until > Date.now() ? old.count + 1 : 1,
    until: Date.now() + windowMs,
  });
  return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
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
