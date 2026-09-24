import { NextResponse } from "next/server";
import {
  schoolRepository,
  storageMode,
} from "@/repositories/school-repository";
import { isAdmin, checkOrigin } from "@/lib/admin-auth";
import { parseSchoolData } from "@/domain/school-validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json({
      data: await schoolRepository.read(),
      storageMode,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os dados escolares." },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  if (!checkOrigin(request) || !(await isAdmin()))
    return NextResponse.json(
      { error: "Acesso administrativo necessário." },
      { status: 401 },
    );
  try {
    const data = parseSchoolData(await request.json());
    await schoolRepository.write(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dados inválidos" },
      { status: 400 },
    );
  }
}
