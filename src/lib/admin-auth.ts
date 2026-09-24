import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
const sign = (value: string) =>
  createHmac("sha256", process.env.ADMIN_PASSWORD!).update(value).digest("hex");
export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) {
    const host = (await headers()).get("host") ?? "";
    return (
      process.env.NODE_ENV !== "production" &&
      /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    );
  }
  const token = (await cookies()).get("study-admin")?.value ?? "";
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || Number(expiry) < Date.now()) return false;
  const expected = sign(expiry);
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
export async function signIn(password: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || password.length > 1000) return false;
  const a = Buffer.from(password),
    b = Buffer.from(configured);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expiry = String(Date.now() + 8 * 3600000);
  (await cookies()).set("study-admin", `${expiry}.${sign(expiry)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 28800,
  });
  return true;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return (
      new URL(origin).host ===
      (request.headers.get("host") ?? new URL(request.url).host)
    );
  } catch {
    return false;
  }
}
