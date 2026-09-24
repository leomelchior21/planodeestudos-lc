import {
  addDays,
  clock,
  daysBetween,
  minutes,
  monday,
  weekday,
} from "../dates";
import {
  planInputSchema,
  type PlanInput,
  type SchoolData,
  type StudyPlan,
  type StudySession,
  type PlanWarning,
} from "../types";

export function relevantEvents(data: SchoolData, classId: string) {
  const c = data.classes.find((c) => c.id === classId);
  const subjectIds = new Set(
    data.classSubjects
      .filter((s) => s.classId === classId)
      .map((s) => s.subjectId),
  );
  return data.events.filter(
    (e) =>
      (!e.classId || e.classId === classId) &&
      (!e.schoolYearId || e.schoolYearId === c?.schoolYearId) &&
      (!e.subjectId || subjectIds.has(e.subjectId)),
  );
}
export function normalizeAvailability(input: PlanInput["availability"]) {
  const output: PlanInput["availability"] = [];
  for (const slot of [...input].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  )) {
    if (minutes(slot.endTime) <= minutes(slot.startTime))
      throw new Error("O horário final deve ser depois do inicial.");
    const prev = output.at(-1);
    if (prev && prev.weekday === slot.weekday && slot.startTime <= prev.endTime)
      prev.endTime = prev.endTime > slot.endTime ? prev.endTime : slot.endTime;
    else output.push({ ...slot });
  }
  return output;
}

export function generateStudyPlan(data: SchoolData, raw: PlanInput): StudyPlan {
  const input = planInputSchema.parse(raw);
  if (
    input.endDate < input.startDate ||
    daysBetween(input.startDate, input.endDate) > 84
  )
    throw new Error("Escolha um período entre 1 e 85 dias.");
  const cls = data.classes.find((c) => c.id === input.classId && c.active);
  if (
    !cls ||
    !data.schoolYears.find((y) => y.id === cls.schoolYearId && y.active)
  )
    throw new Error("Turma indisponível.");
  const subjects = data.subjects.filter(
    (s) =>
      s.active &&
      data.classSubjects.some(
        (c) => c.classId === input.classId && c.subjectId === s.id,
      ),
  );
  if (
    input.priorities.some((p) => !subjects.some((s) => s.id === p.subjectId)) ||
    new Set(input.priorities.map((p) => p.subjectId)).size !==
      input.priorities.length ||
    new Set(input.priorities.map((p) => p.priorityRank)).size !==
      input.priorities.length
  )
    throw new Error("Prioridades inválidas para esta turma.");
  input.availability = normalizeAvailability(input.availability);
  if (
    input.availability.some(
      (a) =>
        !data.settings.weekdays.includes(a.weekday) ||
        a.startTime < data.settings.startTime ||
        a.endTime > data.settings.endTime,
    )
  )
    throw new Error("Disponibilidade fora da janela configurada pela escola.");
  const rule = (code: string) =>
    data.rules.find((r) => r.code === code && r.active)?.value ?? 0;
  const events = relevantEvents(data, input.classId).filter(
    (e) => e.affectsStudyPlan,
  );
  const blocked = (date: string) =>
    !data.settings.allowHolidays &&
    events.some(
      (e) =>
        e.startDate <= date &&
        e.endDate >= date &&
        data.eventTypes.find((t) => t.id === e.eventTypeId)?.blocksStudy,
    );
  const min = data.settings.minimumStudyMinutes;
  const recipes = data.recipes.filter(
    (r) =>
      r.active &&
      r.durationMinutes >= min &&
      r.steps.every(
        (s) => data.activities.find((a) => a.id === s.activityId)?.active,
      ),
  );
  const availableResources = data.resources.filter(
    (r) =>
      r.active &&
      data.subjectResources.some(
        (sr) =>
          sr.resourceId === r.id &&
          subjects.some((s) => s.id === sr.subjectId) &&
          recipes.some(
            (p) =>
              (!p.subjectId || p.subjectId === sr.subjectId) &&
              p.resourceId === r.id,
          ),
      ),
  );
  const plan: StudyPlan = {
    ...input,
    id: "",
    createdAt: `${input.startDate}T12:00:00.000Z`,
    weeks: [],
    warnings: [],
  };
  const all: StudySession[] = [];
  for (
    let ws = monday(input.startDate);
    ws <= input.endDate;
    ws = addDays(ws, 7)
  ) {
    const startDate = ws < input.startDate ? input.startDate : ws,
      endDate = addDays(ws, 6) > input.endDate ? input.endDate : addDays(ws, 6);
    const days: {
      date: string;
      windows: { start: number; end: number }[];
      capacity: number;
      quota: number;
    }[] = [];
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      const windows = blocked(date)
        ? []
        : input.availability
            .filter((a) => a.weekday === weekday(date))
            .map((a) => ({
              start: minutes(a.startTime),
              end: minutes(a.endTime),
            }))
            .filter((w) => w.end - w.start >= min);
      const total = windows.reduce((s, w) => s + w.end - w.start, 0);
      days.push({
        date,
        windows,
        capacity: Math.min(
          Math.floor(total / min) * min,
          Math.floor(data.settings.maxStudyMinutesPerDay / min) * min,
        ),
        quota: 0,
      });
    }
    const totalAvailable = days.reduce(
      (sum, d) => sum + d.windows.reduce((s, w) => s + w.end - w.start, 0),
      0,
    );
    let budget = Math.min(
      Math.floor(
        (totalAvailable * data.settings.targetStudyLoadPercentage) / min,
      ) * min,
      days.reduce((s, d) => s + d.capacity, 0),
    );
    while (budget >= min) {
      let changed = false;
      for (const day of days)
        if (day.quota + min <= day.capacity && budget >= min) {
          day.quota += min;
          budget -= min;
          changed = true;
        }
      if (!changed) break;
    }
    const sessions: StudySession[] = [];
    const resourceCount = (id: string) =>
      sessions.filter((s) => s.resourceId === id).length;
    for (const day of days)
      for (const window of day.windows) {
        let cursor = window.start;
        while (day.quota >= min && cursor + min <= window.end) {
          const unmet = availableResources.filter(
            (r) => resourceCount(r.id) < r.weeklyMinimum,
          );
          const remainingSlots = days
            .filter((d) => d.date >= day.date)
            .reduce((n, d) => n + Math.floor(d.quota / min), 0);
          const requiredSlots = unmet.reduce(
            (n, r) => n + r.weeklyMinimum - resourceCount(r.id),
            0,
          );
          const candidates: {
            subjectId: string;
            resourceId?: string;
            recipe: (typeof recipes)[number];
            score: number;
            breakdown: { code: string; value: number }[];
            eventId?: string;
            rank: number;
            proximity: number;
            last: string;
            forced: boolean;
          }[] = [];
          for (const subject of subjects)
            for (const recipe of recipes.filter(
              (r) =>
                (!r.subjectId || r.subjectId === subject.id) &&
                r.durationMinutes <= day.quota &&
                r.durationMinutes <= window.end - cursor,
            )) {
              const resource = recipe.resourceId
                ? availableResources.find((r) => r.id === recipe.resourceId)
                : undefined;
              if (
                recipe.resourceId &&
                (!resource ||
                  !data.subjectResources.some(
                    (sr) =>
                      sr.subjectId === subject.id &&
                      sr.resourceId === resource.id,
                  ))
              )
                continue;
              if (
                recipe.steps.some((s) => {
                  const a = data.activities.find((a) => a.id === s.activityId)!;
                  return (
                    (a.subjectId && a.subjectId !== subject.id) ||
                    (a.resourceId && a.resourceId !== recipe.resourceId)
                  );
                })
              )
                continue;
              const rank =
                input.priorities.find((p) => p.subjectId === subject.id)
                  ?.priorityRank ?? 999;
              const history = all
                .concat(sessions)
                .filter((s) => s.subjectId === subject.id);
              const last = history.at(-1)?.date ?? "";
              const breakdown: { code: string; value: number }[] = [];
              const add = (code: string, value: number) => {
                if (value) breakdown.push({ code, value });
              };
              if (rank !== 999)
                add(
                  "PRIORITY_SUBJECT",
                  Math.max(
                    0,
                    rule("priority_subject_bonus") -
                      (rank - 1) * rule("priority_rank_step"),
                  ),
                );
              if (
                data.schedules.some(
                  (s) =>
                    s.classId === input.classId &&
                    s.weekday === weekday(day.date) &&
                    s.subjectId === subject.id &&
                    s.endTime <= clock(cursor),
                )
              )
                add("SAME_DAY_CLASS", rule("same_day_subject_bonus"));
              let eventId: string | undefined,
                proximity = 999,
                eventScore = 0;
              for (const event of events.filter(
                (e) => !e.subjectId || e.subjectId === subject.id,
              )) {
                const type = data.eventTypes.find(
                  (t) => t.id === event.eventTypeId,
                )!;
                const delta = daysBetween(day.date, event.startDate);
                if (
                  type.blocksStudy ||
                  delta < 0 ||
                  delta > type.preparationDays
                )
                  continue;
                const phase = data.phases
                  .filter(
                    (p) =>
                      p.eventTypeId === type.id &&
                      delta >= p.daysBeforeMin &&
                      delta <= p.daysBeforeMax,
                  )
                  .sort((a, b) => b.weight - a.weight)[0];
                const score =
                  ((type.studyWeight +
                    rule("upcoming_event_bonus") +
                    (phase?.weight ?? 0)) *
                    event.importance) /
                    3 +
                  (phase?.recommendedActivityType === recipe.activityType
                    ? rule("activity_match_bonus")
                    : 0);
                if (score > eventScore) {
                  eventScore = score;
                  eventId = event.id;
                  proximity = delta;
                }
              }
              add("UPCOMING_EVENT", Math.round(eventScore));
              if (!last || daysBetween(last, day.date) >= rule("spaced_days"))
                add("SPACED_PRACTICE", rule("not_recently_studied_bonus"));
              if (last && daysBetween(last, day.date) === 1)
                add("STUDIED_YESTERDAY", rule("yesterday_penalty"));
              add(
                "REPEATED_SUBJECT",
                sessions.filter((s) => s.subjectId === subject.id).length *
                  rule("repeat_subject_penalty"),
              );
              add(
                "DAILY_LOAD",
                sessions.filter((s) => s.date === day.date).length *
                  rule("daily_load_penalty"),
              );
              const needsResource =
                !!resource &&
                resourceCount(resource.id) < resource.weeklyMinimum;
              if (needsResource)
                add(
                  "WEEKLY_RESOURCE",
                  resource.mandatoryBonus +
                    (resource.preferredWeekdays.includes(weekday(day.date))
                      ? rule("preferred_day_bonus")
                      : 0),
                );
              const preference =
                data.subjectResources.find(
                  (sr) =>
                    sr.subjectId === subject.id &&
                    sr.resourceId === recipe.resourceId,
                )?.priority ?? 1;
              add(
                "RESOURCE_PREFERENCE",
                -(preference - 1) * rule("resource_priority_penalty"),
              );
              candidates.push({
                subjectId: subject.id,
                resourceId: recipe.resourceId ?? undefined,
                recipe,
                score: breakdown.reduce((sum, b) => sum + b.value, 0),
                breakdown,
                eventId,
                rank,
                proximity,
                last,
                forced: needsResource && remainingSlots <= requiredSlots,
              });
            }
          candidates.sort(
            (a, b) =>
              Number(b.forced) - Number(a.forced) ||
              b.score - a.score ||
              a.rank - b.rank ||
              a.proximity - b.proximity ||
              a.last.localeCompare(b.last) ||
              a.subjectId.localeCompare(b.subjectId) ||
              a.recipe.id.localeCompare(b.recipe.id),
          );
          const best = candidates[0];
          if (!best) break;
          const reasonCodes = best.breakdown
            .filter((b) => b.value > 0)
            .map((b) => b.code);
          sessions.push({
            id: `${day.date}-${clock(cursor)}-${best.subjectId}`,
            date: day.date,
            startTime: clock(cursor),
            endTime: clock(cursor + best.recipe.durationMinutes),
            subjectId: best.subjectId,
            resourceId: best.resourceId,
            recipeId: best.recipe.id,
            eventId: best.eventId,
            score: best.score,
            breakdown: best.breakdown,
            reasonCodes,
            reasons: reasonCodes
              .map(
                (code) =>
                  data.reasonTemplates.find((t) => t.code === code)?.text,
              )
              .filter((v): v is string => !!v),
            steps: [...best.recipe.steps]
              .sort((a, b) => a.order - b.order)
              .map((s) => ({
                instruction: data.activities.find((a) => a.id === s.activityId)!
                  .instruction,
                minutes: s.durationMinutes,
              })),
          });
          cursor += best.recipe.durationMinutes;
          day.quota -= best.recipe.durationMinutes;
        }
      }
    all.push(...sessions);
    plan.weeks.push({ startDate, endDate, sessions });
  }
  plan.warnings = validateStudyPlan(data, plan);
  return plan;
}

export function validateStudyPlan(
  data: SchoolData,
  plan: StudyPlan,
): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const events = relevantEvents(data, plan.classId).filter(
    (e) => e.affectsStudyPlan,
  );
  const all = plan.weeks.flatMap((w) => w.sessions);
  const warn = (code: string, message: string, week?: string) =>
    warnings.push({ code, message, week });
  for (const week of plan.weeks) {
    for (const resource of data.resources.filter(
      (r) =>
        r.active &&
        r.weeklyMinimum > 0 &&
        data.subjectResources.some(
          (sr) =>
            sr.resourceId === r.id &&
            data.classSubjects.some(
              (cs) =>
                cs.classId === plan.classId && cs.subjectId === sr.subjectId,
            ) &&
            data.subjects.find((s) => s.id === sr.subjectId)?.active,
        ),
    ))
      if (
        week.sessions.filter((s) => s.resourceId === resource.id).length <
        resource.weeklyMinimum
      )
        warn(
          "WEEKLY_RESOURCE_MISSING",
          `Não foi possível incluir ${resource.weeklyMinimum} atividade(s) de ${resource.name} nesta semana dentro da disponibilidade, da carga e das receitas configuradas.`,
          week.startDate,
        );
    for (const date of new Set(week.sessions.map((s) => s.date))) {
      const sessions = week.sessions
        .filter((s) => s.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (
        sessions.reduce(
          (sum, s) => sum + minutes(s.endTime) - minutes(s.startTime),
          0,
        ) > data.settings.maxStudyMinutesPerDay
      )
        warn("DAILY_LIMIT", "Limite diário excedido.", week.startDate);
      if (
        sessions.some((s, i) => i > 0 && s.startTime < sessions[i - 1].endTime)
      )
        warn("OVERLAP", "Há sobreposição de sessões.", week.startDate);
    }
  }
  for (const session of all) {
    if (
      !plan.availability.some(
        (a) =>
          a.weekday === weekday(session.date) &&
          a.startTime <= session.startTime &&
          a.endTime >= session.endTime,
      )
    )
      warn("OUTSIDE_AVAILABILITY", "Sessão fora da disponibilidade.");
    if (
      minutes(session.endTime) - minutes(session.startTime) <
      data.settings.minimumStudyMinutes
    )
      warn("MINIMUM_DURATION", "Sessão abaixo do mínimo.");
    if (
      session.resourceId &&
      !data.subjectResources.some(
        (r) =>
          r.subjectId === session.subjectId &&
          r.resourceId === session.resourceId,
      )
    )
      warn("INVALID_RESOURCE", "Material incompatível com a disciplina.");
    if (
      !data.settings.allowHolidays &&
      events.some(
        (e) =>
          e.startDate <= session.date &&
          e.endDate >= session.date &&
          data.eventTypes.find((t) => t.id === e.eventTypeId)?.blocksStudy,
      )
    )
      warn("HOLIDAY", "Sessão em data bloqueada.");
  }
  for (const p of plan.priorities)
    if (!all.some((s) => s.subjectId === p.subjectId))
      warn(
        "PRIORITY_MISSING",
        `A disponibilidade não permitiu incluir ${data.subjects.find((s) => s.id === p.subjectId)?.name}.`,
      );
  const priorityIds = new Set(plan.priorities.map((p) => p.subjectId));
  const first = plan.priorities.find((p) => p.priorityRank === 1);
  if (
    first &&
    data.subjects.some(
      (s) =>
        !priorityIds.has(s.id) &&
        all.filter((x) => x.subjectId === s.id).length >
          all.filter((x) => x.subjectId === first.subjectId).length,
    )
  )
    warn(
      "PRIORITY_BALANCE",
      "Eventos e atividades obrigatórias ocuparam mais sessões que a primeira prioridade.",
    );
  for (const e of events.filter(
    (e) =>
      e.subjectId &&
      e.startDate >= plan.startDate &&
      addDays(
        e.startDate,
        -(
          data.eventTypes.find((t) => t.id === e.eventTypeId)
            ?.preparationDays ?? 0
        ),
      ) <= plan.endDate &&
      !data.eventTypes.find((t) => t.id === e.eventTypeId)?.blocksStudy,
  )) {
    const type = data.eventTypes.find((t) => t.id === e.eventTypeId)!;
    if (
      type.studyWeight > 0 &&
      addDays(e.startDate, -type.preparationDays) <= plan.endDate &&
      !all.some(
        (s) =>
          s.subjectId === e.subjectId &&
          s.date <= e.startDate &&
          daysBetween(s.date, e.startDate) <= type.preparationDays,
      )
    )
      warn(
        "EVENT_PREPARATION_MISSING",
        `Não houve espaço para preparação de “${e.title}”.`,
      );
  }
  if (!all.length)
    warn(
      "NO_SESSIONS",
      "Nenhuma sessão cabe nos horários e na carga configurados. Amplie sua disponibilidade ou ajuste as regras.",
    );
  return warnings;
}
