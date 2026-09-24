import { NextResponse } from "next/server";
import { schoolRepository } from "@/repositories/school-repository";
import { generateStudyPlan } from "@/domain/study-plan/engine";
import { checkOrigin } from "@/lib/admin-auth";
export async function POST(request: Request) {
  if (!checkOrigin(request))
    return NextResponse.json(
      { error: "Origem não permitida" },
      { status: 403 },
    );
  let school: Awaited<ReturnType<typeof schoolRepository.read>>;
  try {
    school = await schoolRepository.read();
  } catch (error) {
    console.error("Could not load school data", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os dados da escola. Tente novamente mais tarde." },
      { status: 503 },
    );
  }
  let plan;
  try {
    const input = await request.json();
    plan = generateStudyPlan(school, input);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível gerar seu plano.",
      },
      { status: 400 },
    );
  }
  plan.id = crypto.randomUUID();
  plan.createdAt = new Date().toISOString();
  return NextResponse.json({ saved: { plan, school } });
}
