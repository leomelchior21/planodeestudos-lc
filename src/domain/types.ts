import { z } from "zod";

const id = z.string().min(1).max(100);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const base = { id, active: z.boolean().default(true) };
export const schoolSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    schoolName: z.string().min(1),
    academicYear: z.number().int(),
    planDefaultWeeks: z.number().int().min(1).max(12),
    minimumStudyMinutes: z.number().int().min(10).max(120),
    maxStudyMinutesPerDay: z.number().int().min(10).max(240),
    targetStudyLoadPercentage: z.number().min(0.1).max(1),
    availabilitySlotMinutes: z.number().int().min(10).max(60),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
    startTime: time,
    endTime: time,
    allowHolidays: z.boolean(),
  }),
  schoolYears: z.array(
    z.object({ ...base, name: z.string().min(1), order: z.number() }),
  ),
  classes: z.array(
    z.object({
      ...base,
      schoolYearId: id,
      name: z.string().min(1),
      code: z.string().min(1),
      order: z.number().default(0),
    }),
  ),
  subjects: z.array(
    z.object({
      ...base,
      name: z.string().min(1),
      code: z.string().min(1),
      icon: z.string(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
  ),
  classSubjects: z.array(z.object({ id, classId: id, subjectId: id })),
  schedules: z.array(
    z.object({
      id,
      classId: id,
      weekday: z.number().int().min(0).max(6),
      periodNumber: z.number().int().min(1),
      startTime: time,
      endTime: time,
      subjectId: id,
    }),
  ),
  eventTypes: z.array(
    z.object({
      id,
      code: z.string().min(1),
      name: z.string().min(1),
      studyWeight: z.number(),
      preparationDays: z.number().int().min(0),
      color: z.string(),
      icon: z.string(),
      blocksStudy: z.boolean(),
    }),
  ),
  events: z.array(
    z.object({
      id,
      title: z.string().min(1),
      description: z.string(),
      eventTypeId: id,
      startDate: date,
      endDate: date,
      schoolYearId: id.nullable(),
      classId: id.nullable(),
      subjectId: id.nullable(),
      importance: z.number().min(0).max(5),
      affectsStudyPlan: z.boolean(),
      metadata: z.record(z.string(), z.unknown()),
    }),
  ),
  resources: z.array(
    z.object({
      ...base,
      name: z.string().min(1),
      url: z
        .string()
        .refine(
          (v) => !v || /^https?:\/\//.test(v),
          "Use um endereço http ou https",
        ),
      description: z.string(),
      weeklyMinimum: z.number().int().min(0).max(5),
      preferredWeekdays: z.array(z.number().int().min(0).max(6)),
      mandatoryBonus: z.number(),
    }),
  ),
  subjectResources: z.array(
    z.object({ id, subjectId: id, resourceId: id, priority: z.number() }),
  ),
  activities: z.array(
    z.object({
      ...base,
      subjectId: id.nullable(),
      resourceId: id.nullable(),
      name: z.string().min(1),
      instruction: z.string().min(1),
      durationMinutes: z.number().int().min(1),
      activityType: z.string(),
      difficulty: z.number(),
      priority: z.number(),
    }),
  ),
  recipes: z.array(
    z.object({
      ...base,
      name: z.string().min(1),
      subjectId: id.nullable(),
      resourceId: id.nullable(),
      durationMinutes: z.number().int().min(10),
      activityType: z.string(),
      steps: z
        .array(
          z.object({
            id,
            activityId: id,
            durationMinutes: z.number().int().min(1),
            order: z.number(),
          }),
        )
        .min(1),
    }),
  ),
  rules: z.array(
    z.object({
      id,
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
      value: z.number(),
      active: z.boolean(),
    }),
  ),
  phases: z.array(
    z.object({
      id,
      eventTypeId: id,
      daysBeforeMin: z.number().int().min(0),
      daysBeforeMax: z.number().int().min(0),
      weight: z.number(),
      recommendedActivityType: z.string(),
    }),
  ),
  reasonTemplates: z.array(
    z.object({ id, code: z.string(), text: z.string() }),
  ),
});
export type SchoolData = z.infer<typeof schoolSchema>;
export type Subject = SchoolData["subjects"][number];
export const planInputSchema = z.object({
  classId: id,
  studentName: z.string().trim().min(1, "Informe seu nome.").max(100),
  startDate: date,
  endDate: date,
  priorities: z.array(
    z.object({ subjectId: id, priorityRank: z.number().int().min(1) }),
  ),
  availability: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: time,
        endTime: time,
      }),
    )
    .max(200),
});
export type PlanInput = z.infer<typeof planInputSchema>;
export interface StudySession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  resourceId?: string;
  recipeId: string;
  eventId?: string;
  reasonCodes: string[];
  reasons: string[];
  score: number;
  breakdown: { code: string; value: number }[];
  steps: { instruction: string; minutes: number }[];
}
export interface StudyWeek {
  startDate: string;
  endDate: string;
  sessions: StudySession[];
}
export interface PlanWarning {
  code: string;
  message: string;
  week?: string;
}
export interface StudyPlan extends PlanInput {
  id: string;
  createdAt: string;
  weeks: StudyWeek[];
  warnings: PlanWarning[];
}
export interface SavedPlan {
  plan: StudyPlan;
  school: SchoolData;
}
