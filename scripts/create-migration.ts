import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const tables: Record<string, string> = {
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
};
const refs: Record<string, string> = {
  schoolYearId: "school_years",
  classId: "classes",
  subjectId: "subjects",
  resourceId: "study_resources",
  eventTypeId: "event_types",
};
const seed = JSON.parse(readFileSync("data/seed/school-data.json", "utf8"));
const snake = (value: string) =>
  value.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
let sql = `-- Data-driven school configuration. JSONB is the canonical typed record; generated\n-- columns expose relational fields and enforce foreign keys without duplicate writes.\ncreate table public.school_settings (id boolean primary key default true check(id), data jsonb not null);\nalter table public.school_settings enable row level security;\nrevoke all on public.school_settings from anon, authenticated;\n`;
for (const [key, table] of Object.entries(tables)) {
  const sample = seed[key][0];
  sql += `\ncreate table public.${table} (\n id text primary key,\n data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id)`;
  for (const [field, value] of Object.entries(sample)) {
    if (field === "id" || field === "steps") continue;
    const type =
      typeof value === "number"
        ? "numeric"
        : typeof value === "boolean"
          ? "boolean"
          : Array.isArray(value) || (value && typeof value === "object")
            ? "jsonb"
            : "text";
    const expression =
      type === "jsonb"
        ? `data->'${field}'`
        : type === "text"
          ? `data->>'${field}'`
          : `(data->>'${field}')::${type}`;
    sql += `,\n "${snake(field)}" ${type} generated always as (${expression}) stored`;
  }
  sql += `\n);\nalter table public.${table} enable row level security;\nrevoke all on public.${table} from anon, authenticated;\n`;
}
for (const [key, table] of Object.entries(tables))
  for (const field of Object.keys(seed[key][0]))
    if (refs[field])
      sql += `alter table public.${table} add constraint ${table}_${snake(field)}_fk foreign key (${snake(field)}) references public.${refs[field]}(id) deferrable initially deferred;\ncreate index ${table}_${snake(field)}_idx on public.${table}(${snake(field)});\n`;
sql += `\ncreate unique index class_schedule_slot on public.class_schedule(class_id, weekday, period_number);\ncreate unique index class_subjects_pair on public.class_subjects(class_id, subject_id);\ncreate unique index subject_resources_pair on public.subject_resources(subject_id, resource_id);\ncreate index academic_events_dates on public.academic_events(start_date, end_date);\n\ncreate table public.study_recipe_steps (\n id text primary key, recipe_id text not null references public.study_recipes(id) deferrable initially deferred,\n activity_id text not null references public.study_activity_templates(id) deferrable initially deferred,\n duration_minutes integer not null check(duration_minutes > 0), step_order integer not null\n);\nalter table public.study_recipe_steps enable row level security;\nrevoke all on public.study_recipe_steps from anon, authenticated;\n\ncreate table public.study_plans (id uuid primary key, data jsonb not null, created_at timestamptz not null default now());\nalter table public.study_plans enable row level security;\nrevoke all on public.study_plans from anon, authenticated;\n\ncreate or replace function public.import_school_data(payload jsonb) returns void\nlanguage plpgsql security invoker set search_path = public as $fn$\nbegin\n perform pg_advisory_xact_lock(740021);\n if payload->>'version' <> '1' then raise exception 'Unsupported data version'; end if;\n set constraints all deferred;\n delete from public.study_recipe_steps;\n`;
for (const [key, table] of Object.entries(tables)) {
  sql += ` delete from public.${table};\n insert into public.${table}(id,data) select record->>'id',record from jsonb_array_elements(payload->'${key}') record;\n`;
}
sql += ` insert into public.study_recipe_steps(id,recipe_id,activity_id,duration_minutes,step_order)\n select r.id || ':' || (step->>'id'),r.id,step->>'activityId',(step->>'durationMinutes')::integer,(step->>'order')::integer\n from public.study_recipes r cross join lateral jsonb_array_elements(r.data->'steps') step;\n insert into public.school_settings(id,data) values(true,payload->'settings') on conflict(id) do update set data=excluded.data;\nend;\n$fn$;\n\ncreate or replace function public.export_school_data() returns jsonb\nlanguage sql stable security invoker set search_path = public as $fn$\n select jsonb_build_object('version',1,'settings',(select data from public.school_settings where id=true),\n`;
sql += Object.entries(tables)
  .map(
    ([key, table]) =>
      ` '${key}',coalesce((select jsonb_agg(data order by id) from public.${table}),'[]'::jsonb)`,
  )
  .join(",\n");
sql += `);\n$fn$;\nrevoke all on function public.import_school_data(jsonb) from public,anon,authenticated;\nrevoke all on function public.export_school_data() from public,anon,authenticated;\ngrant execute on function public.import_school_data(jsonb) to service_role;\ngrant execute on function public.export_school_data() to service_role;\ngrant all on all tables in schema public to service_role;\n`;
mkdirSync("supabase/migrations", { recursive: true });
writeFileSync("supabase/migrations/202609230001_school.sql", sql);
writeFileSync(
  "supabase/seed.sql",
  `-- Fictitious demonstration data.\nselect public.import_school_data($seed$${JSON.stringify(seed)}$seed$::jsonb);\n`,
);
console.log("Migration and SQL seed generated.");
