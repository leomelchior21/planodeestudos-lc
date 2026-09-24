import { notFound } from "next/navigation";
import { planRepository } from "@/repositories/school-repository";
import { PlanView } from "@/components/plan-view";
import { isAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ debug?: string }>;
}) {
  const value = await planRepository.get((await params).id);
  if (!value) notFound();
  return (
    <PlanView
      saved={value}
      debug={(await searchParams).debug === "true" && (await isAdmin())}
    />
  );
}
