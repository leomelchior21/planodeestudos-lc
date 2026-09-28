import { minutes } from "../dates";
import type { PlanSummary, SavedPlan } from "../types";

export function summarizePlan(saved: SavedPlan): PlanSummary {
  const { plan, school } = saved;
  const cls = school.classes.find((c) => c.id === plan.classId);
  const year = school.schoolYears.find((y) => y.id === cls?.schoolYearId);
  const sessions = plan.weeks.flatMap((week) => week.sessions);
  return {
    id: plan.id,
    studentName: plan.studentName,
    createdAt: plan.createdAt,
    startDate: plan.startDate,
    endDate: plan.endDate,
    yearName: year?.name ?? "",
    className: cls?.name ?? "",
    classCode: cls?.code ?? "",
    sessionCount: sessions.length,
    durationMinutes: sessions.reduce(
      (sum, session) =>
        sum + minutes(session.endTime) - minutes(session.startTime),
      0,
    ),
    subjects: [...plan.priorities]
      .sort((a, b) => a.priorityRank - b.priorityRank)
      .map((priority) => {
        const subject = school.subjects.find(
          (s) => s.id === priority.subjectId,
        );
        return {
          rank: priority.priorityRank,
          code: subject?.code ?? "",
          name: subject?.name ?? priority.subjectId,
        };
      }),
    availability: [...plan.availability]
      .sort(
        (a, b) =>
          a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
      )
      .map((slot) => ({
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
  };
}
