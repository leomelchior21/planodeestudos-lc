import { NextResponse } from "next/server";
import {
  planRepository,
  schoolRepository,
} from "@/repositories/school-repository";
import { generateStudyPlan } from "@/domain/study-plan/engine";
import { summarizePlan } from "@/domain/study-plan/summary";
import { checkOrigin, isAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const plans = await planRepository.list();
    return NextResponse.json({
      plans: plans
        .sort((a, b) => b.plan.createdAt.localeCompare(a.plan.createdAt))
        .map(summarizePlan),
    });
  } catch (error) {
    console.error("Could not list plans", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os planos gerados." },
      { status: 503 },
    );
  }
}

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
  const saved = { plan, school };
  try {
    await planRepository.save(saved);
  } catch (error) {
    console.error("Could not persist generated plan", error);
  }
  return NextResponse.json({ saved });
}
