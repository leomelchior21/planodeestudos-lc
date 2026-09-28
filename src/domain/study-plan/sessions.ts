import type { SchoolData, StudySession } from "../types";

function recipeSteps(
  school: SchoolData,
  recipeId: string,
): StudySession["steps"] {
  const recipe = school.recipes.find((r) => r.id === recipeId);
  if (!recipe) return [];
  return [...recipe.steps]
    .sort((a, b) => a.order - b.order)
    .map((step) => ({
      instruction:
        school.activities.find((a) => a.id === step.activityId)?.instruction ??
        "",
      minutes: step.durationMinutes,
    }));
}

function fitSteps(steps: StudySession["steps"], totalMinutes: number) {
  const fitted: StudySession["steps"] = [];
  let remaining = totalMinutes;
  for (const step of steps) {
    if (remaining <= 0) break;
    const allocated = Math.min(step.minutes, remaining);
    fitted.push({ instruction: step.instruction, minutes: allocated });
    remaining -= allocated;
  }
  return { fitted, optional: steps.slice(fitted.length) };
}

export function buildSessionSteps(
  school: SchoolData,
  recipeId: string,
  totalMinutes: number,
): StudySession["steps"] {
  return fitSteps(recipeSteps(school, recipeId), totalMinutes).fitted;
}

export function buildOptionalSessionSteps(
  school: SchoolData,
  recipeId: string,
  totalMinutes: number,
): StudySession["steps"] {
  return fitSteps(recipeSteps(school, recipeId), totalMinutes).optional;
}

export function mergeConsecutiveSessions(
  sessions: StudySession[],
): StudySession[] {
  const merged: StudySession[] = [];
  for (const session of [...sessions].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )) {
    const last = merged.at(-1);
    if (
      last &&
      last.date === session.date &&
      last.subjectId === session.subjectId &&
      (last.resourceId ?? "") === (session.resourceId ?? "") &&
      last.endTime === session.startTime
    ) {
      last.endTime = session.endTime;
      last.reasons = [...new Set([...last.reasons, ...session.reasons])];
      last.reasonCodes = [
        ...new Set([...last.reasonCodes, ...session.reasonCodes]),
      ];
      last.eventId = last.eventId ?? session.eventId;
      continue;
    }
    merged.push({ ...session });
  }
  return merged;
}
