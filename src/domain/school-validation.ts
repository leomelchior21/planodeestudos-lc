import { schoolSchema, type SchoolData } from "./types";
import { minutes } from "./dates";
export function parseSchoolData(input: unknown): SchoolData {
  const d = schoolSchema.parse(input);
  const errors: string[] = [];
  const ref = (
    collection: { id: string }[],
    value: string | null,
    label: string,
  ) => {
    if (value && !collection.some((x) => x.id === value))
      errors.push(`${label}: referência inexistente (${value})`);
  };
  for (const [key, value] of Object.entries(d))
    if (Array.isArray(value)) {
      const ids = value.map((v) => v.id);
      if (new Set(ids).size !== ids.length)
        errors.push(`${key}: IDs duplicados`);
    }
  d.classes.forEach((x) => ref(d.schoolYears, x.schoolYearId, "Turma"));
  d.classSubjects.forEach((x) => {
    ref(d.classes, x.classId, "Disciplina da turma");
    ref(d.subjects, x.subjectId, "Disciplina da turma");
  });
  const memberships = d.classSubjects.map((x) => `${x.classId}:${x.subjectId}`);
  if (new Set(memberships).size !== memberships.length)
    errors.push("Disciplinas por turma: vínculos duplicados");
  d.schedules.forEach((x) => {
    ref(d.classes, x.classId, "Grade");
    ref(d.subjects, x.subjectId, "Grade");
    if (minutes(x.endTime) <= minutes(x.startTime))
      errors.push("Grade: término deve ser depois do início");
    if (
      !d.classSubjects.some(
        (s) => s.classId === x.classId && s.subjectId === x.subjectId,
      )
    )
      errors.push("Grade: disciplina não pertence à turma");
  });
  const scheduleKeys = d.schedules.map(
    (x) => `${x.classId}:${x.weekday}:${x.periodNumber}`,
  );
  if (new Set(scheduleKeys).size !== scheduleKeys.length)
    errors.push("Grade: períodos duplicados");
  d.events.forEach((x) => {
    ref(d.eventTypes, x.eventTypeId, "Evento");
    ref(d.schoolYears, x.schoolYearId, "Evento");
    ref(d.classes, x.classId, "Evento");
    ref(d.subjects, x.subjectId, "Evento");
    if (x.endDate < x.startDate) errors.push("Evento: datas invertidas");
    if (
      x.classId &&
      x.schoolYearId &&
      d.classes.find((c) => c.id === x.classId)?.schoolYearId !== x.schoolYearId
    )
      errors.push("Evento: turma incompatível com o ano");
  });
  d.subjectResources.forEach((x) => {
    ref(d.subjects, x.subjectId, "Material");
    ref(d.resources, x.resourceId, "Material");
  });
  const resourceLinks = d.subjectResources.map(
    (x) => `${x.subjectId}:${x.resourceId}`,
  );
  if (new Set(resourceLinks).size !== resourceLinks.length)
    errors.push("Materiais por disciplina: vínculos duplicados");
  d.activities.forEach((x) => {
    ref(d.subjects, x.subjectId, "Atividade");
    ref(d.resources, x.resourceId, "Atividade");
  });
  d.recipes.forEach((x) => {
    ref(d.subjects, x.subjectId, "Receita");
    ref(d.resources, x.resourceId, "Receita");
    x.steps.forEach((s) => ref(d.activities, s.activityId, "Etapa"));
    if (
      x.steps.reduce((sum, s) => sum + s.durationMinutes, 0) !==
      x.durationMinutes
    )
      errors.push(
        `Receita ${x.name}: a soma das etapas deve corresponder à duração`,
      );
  });
  d.phases.forEach((x) => {
    ref(d.eventTypes, x.eventTypeId, "Fase");
    if (x.daysBeforeMin > x.daysBeforeMax)
      errors.push("Fase: intervalo invertido");
  });
  if (minutes(d.settings.endTime) <= minutes(d.settings.startTime))
    errors.push("Janela de disponibilidade inválida");
  if (d.settings.minimumStudyMinutes > d.settings.maxStudyMinutesPerDay)
    errors.push("Mínimo de sessão excede o limite diário");
  if (new Set(d.settings.weekdays).size !== d.settings.weekdays.length)
    errors.push("Dias da semana duplicados");
  if (errors.length) throw new Error(errors.join("\n"));
  return d;
}
