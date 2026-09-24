import { NextResponse } from "next/server";
import {
  schoolRepository,
  planRepository,
} from "@/repositories/school-repository";
import { generateStudyPlan } from "@/domain/study-plan/engine";
import { checkOrigin } from "@/lib/admin-auth";
export async function POST(request: Request) {
  if (!checkOrigin(request))
    return NextResponse.json(
      { error: "Origem não permitida" },
      { status: 403 },
    );
  try {
    const input = await request.json();
    const school = await schoolRepository.read();
    const plan = generateStudyPlan(school, input);
    plan.id = crypto.randomUUID();
    plan.createdAt = new Date().toISOString();
    await planRepository.save({ plan, school });
    return NextResponse.json({ id: plan.id });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Não foi possível gerar seu plano.",
      },
      { status: 400 },
    );
  }
}
