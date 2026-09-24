import "server-only";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import seed from "../../data/seed/school-data.json";
import { parseSchoolData } from "@/domain/school-validation";
import type { SchoolData, SavedPlan } from "@/domain/types";
import type { Database } from "@/lib/database.types";

export interface SchoolRepository {
  read(): Promise<SchoolData>;
  write(data: SchoolData): Promise<void>;
}
export interface StudyPlanRepository {
  get(id: string): Promise<SavedPlan | null>;
  save(value: SavedPlan): Promise<void>;
}
const directory = path.join(process.cwd(), ".local");
async function atomicWrite(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
  await rename(temporary, file);
}
class LocalSchoolRepository implements SchoolRepository {
  async read() {
    try {
      return parseSchoolData(
        JSON.parse(
          await readFile(path.join(directory, "school-data.json"), "utf8"),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return parseSchoolData(seed);
    }
  }
  async write(data: SchoolData) {
    await atomicWrite(
      path.join(directory, "school-data.json"),
      parseSchoolData(data),
    );
  }
}
class LocalPlanRepository implements StudyPlanRepository {
  async get(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) return null;
    try {
      return JSON.parse(
        await readFile(path.join(directory, "plans", `${id}.json`), "utf8"),
      ) as SavedPlan;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async save(value: SavedPlan) {
    await atomicWrite(
      path.join(directory, "plans", `${value.plan.id}.json`),
      value,
    );
  }
}
export const tableMap = {
  schoolYears: "school_years",
  classes: "classes",
  subjects: "subjects",
  classSubjects: "class_subjects",
  schedules: "class_schedule",
  eventTypes: "event_types",
  events: "academic_events",
  resources: "study_resources",
  subjectResources: "subject_resources",
  activities: "study_activity_templates",
  recipes: "study_recipes",
  rules: "study_rules",
  phases: "event_study_phases",
  reasonTemplates: "reason_templates",
} as const;
function client() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
class SupabaseSchoolRepository implements SchoolRepository {
  async read() {
    const db = client();
    const { data, error } = await db.rpc("export_school_data");
    if (error) throw new Error(error.message);
    return parseSchoolData(data);
  }
  async write(data: SchoolData) {
    const { error } = await client().rpc("import_school_data", {
      payload: parseSchoolData(data),
    });
    if (error) throw new Error(error.message);
  }
}
class SupabasePlanRepository implements StudyPlanRepository {
  async get(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) return null;
    const { data, error } = await client()
      .from("study_plans")
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.data as SavedPlan | null;
  }
  async save(value: SavedPlan) {
    const { error } = await client()
      .from("study_plans")
      .insert({ id: value.plan.id, data: value });
    if (error) throw new Error(error.message);
  }
}
const remote = process.env.SCHOOL_STORAGE === "supabase";
if (
  remote &&
  (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
)
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios com SCHOOL_STORAGE=supabase.");
export const schoolRepository: SchoolRepository = remote
  ? new SupabaseSchoolRepository()
  : new LocalSchoolRepository();
export const planRepository: StudyPlanRepository = remote
  ? new SupabasePlanRepository()
  : new LocalPlanRepository();
export const storageMode = remote ? "supabase" : "local";
