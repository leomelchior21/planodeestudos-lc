import { planRepository } from "@/repositories/school-repository";
import { PlanView } from "@/components/plan-view";
import { BrowserPlanPage } from "@/components/browser-plan-page";
import { isAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ debug?: string }>;
}) {
  const { id } = await params;
  const value = await planRepository.get(id);
  const debug = (await searchParams).debug === "true" && (await isAdmin());
  if (!value) return <BrowserPlanPage id={id} debug={debug} />;
  return (
    <PlanView
      saved={value}
      debug={debug}
    />
  );
}
