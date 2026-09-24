"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedPlan } from "@/domain/types";
import { loadBrowserPlan } from "@/lib/browser-plans";
import { PlanView } from "./plan-view";

export function BrowserPlanPage({ id, debug }: { id: string; debug: boolean }) {
  const [saved, setSaved] = useState<SavedPlan | null | undefined>();

  useEffect(() => {
    setSaved(loadBrowserPlan(id));
  }, [id]);

  if (saved === undefined)
    return <main className="error-page">Carregando seu plano…</main>;
  if (!saved)
    return (
      <main className="error-page">
        <h1>Plano não encontrado neste navegador</h1>
        <p>Crie um novo plano para visualizar e baixar o PDF.</p>
        <Link className="button primary" href="/student">
          Criar meu plano
        </Link>
      </main>
    );
  return <PlanView saved={saved} debug={debug} />;
}
