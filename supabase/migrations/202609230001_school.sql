-- Data-driven school configuration. JSONB is the canonical typed record; generated
-- columns expose relational fields and enforce foreign keys without duplicate writes.
create table public.school_settings (id boolean primary key default true check(id), data jsonb not null);
alter table public.school_settings enable row level security;
revoke all on public.school_settings from anon, authenticated;

create table public.school_years (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "name" text generated always as (data->>'name') stored,
 "order" numeric generated always as ((data->>'order')::numeric) stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored
);
alter table public.school_years enable row level security;
revoke all on public.school_years from anon, authenticated;

create table public.classes (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "school_year_id" text generated always as (data->>'schoolYearId') stored,
 "name" text generated always as (data->>'name') stored,
 "code" text generated always as (data->>'code') stored,
 "order" numeric generated always as ((data->>'order')::numeric) stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored
);
alter table public.classes enable row level security;
revoke all on public.classes from anon, authenticated;

create table public.subjects (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "code" text generated always as (data->>'code') stored,
 "name" text generated always as (data->>'name') stored,
 "icon" text generated always as (data->>'icon') stored,
 "color" text generated always as (data->>'color') stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored
);
alter table public.subjects enable row level security;
revoke all on public.subjects from anon, authenticated;

create table public.class_subjects (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "class_id" text generated always as (data->>'classId') stored,
 "subject_id" text generated always as (data->>'subjectId') stored
);
alter table public.class_subjects enable row level security;
revoke all on public.class_subjects from anon, authenticated;

create table public.class_schedule (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "class_id" text generated always as (data->>'classId') stored,
 "weekday" numeric generated always as ((data->>'weekday')::numeric) stored,
 "period_number" numeric generated always as ((data->>'periodNumber')::numeric) stored,
 "start_time" text generated always as (data->>'startTime') stored,
 "end_time" text generated always as (data->>'endTime') stored,
 "subject_id" text generated always as (data->>'subjectId') stored
);
alter table public.class_schedule enable row level security;
revoke all on public.class_schedule from anon, authenticated;

create table public.event_types (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "code" text generated always as (data->>'code') stored,
 "name" text generated always as (data->>'name') stored,
 "study_weight" numeric generated always as ((data->>'studyWeight')::numeric) stored,
 "preparation_days" numeric generated always as ((data->>'preparationDays')::numeric) stored,
 "color" text generated always as (data->>'color') stored,
 "icon" text generated always as (data->>'icon') stored,
 "blocks_study" boolean generated always as ((data->>'blocksStudy')::boolean) stored
);
alter table public.event_types enable row level security;
revoke all on public.event_types from anon, authenticated;

create table public.academic_events (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "title" text generated always as (data->>'title') stored,
 "description" text generated always as (data->>'description') stored,
 "event_type_id" text generated always as (data->>'eventTypeId') stored,
 "start_date" text generated always as (data->>'startDate') stored,
 "end_date" text generated always as (data->>'endDate') stored,
 "school_year_id" text generated always as (data->>'schoolYearId') stored,
 "class_id" text generated always as (data->>'classId') stored,
 "subject_id" text generated always as (data->>'subjectId') stored,
 "importance" numeric generated always as ((data->>'importance')::numeric) stored,
 "affects_study_plan" boolean generated always as ((data->>'affectsStudyPlan')::boolean) stored,
 "metadata" jsonb generated always as (data->'metadata') stored
);
alter table public.academic_events enable row level security;
revoke all on public.academic_events from anon, authenticated;

create table public.study_resources (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "name" text generated always as (data->>'name') stored,
 "description" text generated always as (data->>'description') stored,
 "url" text generated always as (data->>'url') stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored,
 "weekly_minimum" numeric generated always as ((data->>'weeklyMinimum')::numeric) stored,
 "preferred_weekdays" jsonb generated always as (data->'preferredWeekdays') stored,
 "mandatory_bonus" numeric generated always as ((data->>'mandatoryBonus')::numeric) stored
);
alter table public.study_resources enable row level security;
revoke all on public.study_resources from anon, authenticated;

create table public.subject_resources (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "subject_id" text generated always as (data->>'subjectId') stored,
 "resource_id" text generated always as (data->>'resourceId') stored,
 "priority" numeric generated always as ((data->>'priority')::numeric) stored
);
alter table public.subject_resources enable row level security;
revoke all on public.subject_resources from anon, authenticated;

create table public.study_activity_templates (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "subject_id" text generated always as (data->>'subjectId') stored,
 "resource_id" text generated always as (data->>'resourceId') stored,
 "name" text generated always as (data->>'name') stored,
 "instruction" text generated always as (data->>'instruction') stored,
 "duration_minutes" numeric generated always as ((data->>'durationMinutes')::numeric) stored,
 "activity_type" text generated always as (data->>'activityType') stored,
 "difficulty" numeric generated always as ((data->>'difficulty')::numeric) stored,
 "priority" numeric generated always as ((data->>'priority')::numeric) stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored
);
alter table public.study_activity_templates enable row level security;
revoke all on public.study_activity_templates from anon, authenticated;

create table public.study_recipes (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "name" text generated always as (data->>'name') stored,
 "subject_id" text generated always as (data->>'subjectId') stored,
 "resource_id" text generated always as (data->>'resourceId') stored,
 "duration_minutes" numeric generated always as ((data->>'durationMinutes')::numeric) stored,
 "activity_type" text generated always as (data->>'activityType') stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored
);
alter table public.study_recipes enable row level security;
revoke all on public.study_recipes from anon, authenticated;

create table public.study_rules (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "code" text generated always as (data->>'code') stored,
 "name" text generated always as (data->>'name') stored,
 "value" numeric generated always as ((data->>'value')::numeric) stored,
 "description" text generated always as (data->>'description') stored,
 "active" boolean generated always as ((data->>'active')::boolean) stored
);
alter table public.study_rules enable row level security;
revoke all on public.study_rules from anon, authenticated;

create table public.event_study_phases (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "event_type_id" text generated always as (data->>'eventTypeId') stored,
 "days_before_min" numeric generated always as ((data->>'daysBeforeMin')::numeric) stored,
 "days_before_max" numeric generated always as ((data->>'daysBeforeMax')::numeric) stored,
 "weight" numeric generated always as ((data->>'weight')::numeric) stored,
 "recommended_activity_type" text generated always as (data->>'recommendedActivityType') stored
);
alter table public.event_study_phases enable row level security;
revoke all on public.event_study_phases from anon, authenticated;

create table public.reason_templates (
 id text primary key,
 data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id),
 "code" text generated always as (data->>'code') stored,
 "text" text generated always as (data->>'text') stored
);
alter table public.reason_templates enable row level security;
revoke all on public.reason_templates from anon, authenticated;
alter table public.classes add constraint classes_school_year_id_fk foreign key (school_year_id) references public.school_years(id) deferrable initially deferred;
create index classes_school_year_id_idx on public.classes(school_year_id);
alter table public.class_subjects add constraint class_subjects_class_id_fk foreign key (class_id) references public.classes(id) deferrable initially deferred;
create index class_subjects_class_id_idx on public.class_subjects(class_id);
alter table public.class_subjects add constraint class_subjects_subject_id_fk foreign key (subject_id) references public.subjects(id) deferrable initially deferred;
create index class_subjects_subject_id_idx on public.class_subjects(subject_id);
alter table public.class_schedule add constraint class_schedule_class_id_fk foreign key (class_id) references public.classes(id) deferrable initially deferred;
create index class_schedule_class_id_idx on public.class_schedule(class_id);
alter table public.class_schedule add constraint class_schedule_subject_id_fk foreign key (subject_id) references public.subjects(id) deferrable initially deferred;
create index class_schedule_subject_id_idx on public.class_schedule(subject_id);
alter table public.academic_events add constraint academic_events_event_type_id_fk foreign key (event_type_id) references public.event_types(id) deferrable initially deferred;
create index academic_events_event_type_id_idx on public.academic_events(event_type_id);
alter table public.academic_events add constraint academic_events_school_year_id_fk foreign key (school_year_id) references public.school_years(id) deferrable initially deferred;
create index academic_events_school_year_id_idx on public.academic_events(school_year_id);
alter table public.academic_events add constraint academic_events_class_id_fk foreign key (class_id) references public.classes(id) deferrable initially deferred;
create index academic_events_class_id_idx on public.academic_events(class_id);
alter table public.academic_events add constraint academic_events_subject_id_fk foreign key (subject_id) references public.subjects(id) deferrable initially deferred;
create index academic_events_subject_id_idx on public.academic_events(subject_id);
alter table public.subject_resources add constraint subject_resources_subject_id_fk foreign key (subject_id) references public.subjects(id) deferrable initially deferred;
create index subject_resources_subject_id_idx on public.subject_resources(subject_id);
alter table public.subject_resources add constraint subject_resources_resource_id_fk foreign key (resource_id) references public.study_resources(id) deferrable initially deferred;
create index subject_resources_resource_id_idx on public.subject_resources(resource_id);
alter table public.study_activity_templates add constraint study_activity_templates_subject_id_fk foreign key (subject_id) references public.subjects(id) deferrable initially deferred;
create index study_activity_templates_subject_id_idx on public.study_activity_templates(subject_id);
alter table public.study_activity_templates add constraint study_activity_templates_resource_id_fk foreign key (resource_id) references public.study_resources(id) deferrable initially deferred;
create index study_activity_templates_resource_id_idx on public.study_activity_templates(resource_id);
alter table public.study_recipes add constraint study_recipes_subject_id_fk foreign key (subject_id) references public.subjects(id) deferrable initially deferred;
create index study_recipes_subject_id_idx on public.study_recipes(subject_id);
alter table public.study_recipes add constraint study_recipes_resource_id_fk foreign key (resource_id) references public.study_resources(id) deferrable initially deferred;
create index study_recipes_resource_id_idx on public.study_recipes(resource_id);
alter table public.event_study_phases add constraint event_study_phases_event_type_id_fk foreign key (event_type_id) references public.event_types(id) deferrable initially deferred;
create index event_study_phases_event_type_id_idx on public.event_study_phases(event_type_id);

create unique index class_schedule_slot on public.class_schedule(class_id, weekday, period_number);
create unique index class_subjects_pair on public.class_subjects(class_id, subject_id);
create unique index subject_resources_pair on public.subject_resources(subject_id, resource_id);
create index academic_events_dates on public.academic_events(start_date, end_date);

create table public.study_recipe_steps (
 id text primary key, recipe_id text not null references public.study_recipes(id) deferrable initially deferred,
 activity_id text not null references public.study_activity_templates(id) deferrable initially deferred,
 duration_minutes integer not null check(duration_minutes > 0), step_order integer not null
);
alter table public.study_recipe_steps enable row level security;
revoke all on public.study_recipe_steps from anon, authenticated;

create table public.study_plans (id uuid primary key, data jsonb not null, created_at timestamptz not null default now());
alter table public.study_plans enable row level security;
revoke all on public.study_plans from anon, authenticated;

create or replace function public.import_school_data(payload jsonb) returns void
language plpgsql security invoker set search_path = public as $fn$
begin
 perform pg_advisory_xact_lock(740021);
 if payload->>'version' <> '1' then raise exception 'Unsupported data version'; end if;
 set constraints all deferred;
 delete from public.study_recipe_steps;
 delete from public.school_years;
 insert into public.school_years(id,data) select record->>'id',record from jsonb_array_elements(payload->'schoolYears') record;
 delete from public.classes;
 insert into public.classes(id,data) select record->>'id',record from jsonb_array_elements(payload->'classes') record;
 delete from public.subjects;
 insert into public.subjects(id,data) select record->>'id',record from jsonb_array_elements(payload->'subjects') record;
 delete from public.class_subjects;
 insert into public.class_subjects(id,data) select record->>'id',record from jsonb_array_elements(payload->'classSubjects') record;
 delete from public.class_schedule;
 insert into public.class_schedule(id,data) select record->>'id',record from jsonb_array_elements(payload->'schedules') record;
 delete from public.event_types;
 insert into public.event_types(id,data) select record->>'id',record from jsonb_array_elements(payload->'eventTypes') record;
 delete from public.academic_events;
 insert into public.academic_events(id,data) select record->>'id',record from jsonb_array_elements(payload->'events') record;
 delete from public.study_resources;
 insert into public.study_resources(id,data) select record->>'id',record from jsonb_array_elements(payload->'resources') record;
 delete from public.subject_resources;
 insert into public.subject_resources(id,data) select record->>'id',record from jsonb_array_elements(payload->'subjectResources') record;
 delete from public.study_activity_templates;
 insert into public.study_activity_templates(id,data) select record->>'id',record from jsonb_array_elements(payload->'activities') record;
 delete from public.study_recipes;
 insert into public.study_recipes(id,data) select record->>'id',record from jsonb_array_elements(payload->'recipes') record;
 delete from public.study_rules;
 insert into public.study_rules(id,data) select record->>'id',record from jsonb_array_elements(payload->'rules') record;
 delete from public.event_study_phases;
 insert into public.event_study_phases(id,data) select record->>'id',record from jsonb_array_elements(payload->'phases') record;
 delete from public.reason_templates;
 insert into public.reason_templates(id,data) select record->>'id',record from jsonb_array_elements(payload->'reasonTemplates') record;
 insert into public.study_recipe_steps(id,recipe_id,activity_id,duration_minutes,step_order)
 select r.id || ':' || (step->>'id'),r.id,step->>'activityId',(step->>'durationMinutes')::integer,(step->>'order')::integer
 from public.study_recipes r cross join lateral jsonb_array_elements(r.data->'steps') step;
 insert into public.school_settings(id,data) values(true,payload->'settings') on conflict(id) do update set data=excluded.data;
end;
$fn$;

create or replace function public.export_school_data() returns jsonb
language sql stable security invoker set search_path = public as $fn$
 select jsonb_build_object('version',1,'settings',(select data from public.school_settings where id=true),
 'schoolYears',coalesce((select jsonb_agg(data order by id) from public.school_years),'[]'::jsonb),
 'classes',coalesce((select jsonb_agg(data order by id) from public.classes),'[]'::jsonb),
 'subjects',coalesce((select jsonb_agg(data order by id) from public.subjects),'[]'::jsonb),
 'classSubjects',coalesce((select jsonb_agg(data order by id) from public.class_subjects),'[]'::jsonb),
 'schedules',coalesce((select jsonb_agg(data order by id) from public.class_schedule),'[]'::jsonb),
 'eventTypes',coalesce((select jsonb_agg(data order by id) from public.event_types),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(data order by id) from public.academic_events),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(data order by id) from public.study_resources),'[]'::jsonb),
 'subjectResources',coalesce((select jsonb_agg(data order by id) from public.subject_resources),'[]'::jsonb),
 'activities',coalesce((select jsonb_agg(data order by id) from public.study_activity_templates),'[]'::jsonb),
 'recipes',coalesce((select jsonb_agg(data order by id) from public.study_recipes),'[]'::jsonb),
 'rules',coalesce((select jsonb_agg(data order by id) from public.study_rules),'[]'::jsonb),
 'phases',coalesce((select jsonb_agg(data order by id) from public.event_study_phases),'[]'::jsonb),
 'reasonTemplates',coalesce((select jsonb_agg(data order by id) from public.reason_templates),'[]'::jsonb));
$fn$;
revoke all on function public.import_school_data(jsonb) from public,anon,authenticated;
revoke all on function public.export_school_data() from public,anon,authenticated;
grant execute on function public.import_school_data(jsonb) to service_role;
grant execute on function public.export_school_data() to service_role;
grant all on all tables in schema public to service_role;
