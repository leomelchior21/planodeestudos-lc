import type { SavedPlan } from "@/domain/types";

const key = (id: string) => `study-plan:${id}`;

export function saveBrowserPlan(saved: SavedPlan) {
  const data = JSON.stringify(saved);
  try {
    localStorage.setItem(key(saved.plan.id), data);
  } catch {
    try {
      sessionStorage.setItem(key(saved.plan.id), data);
    } catch {
      throw new Error("Este navegador não permitiu guardar o plano. Libere o armazenamento do site e tente novamente.");
    }
  }
}

export function loadBrowserPlan(id: string): SavedPlan | null {
  let data: string | null = null;
  try {
    data = localStorage.getItem(key(id));
  } catch {
    // The session store can still be available when persistent storage is blocked.
  }
  if (!data)
    try {
      data = sessionStorage.getItem(key(id));
    } catch {
      return null;
    }
  if (!data) return null;
  try {
    const saved = JSON.parse(data) as SavedPlan;
    return saved.plan?.id === id && saved.school ? saved : null;
  } catch {
    return null;
  }
}
