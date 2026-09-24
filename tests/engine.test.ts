import test from "node:test";
import assert from "node:assert/strict";
import seed from "../data/seed/school-data.json";
import { parseSchoolData } from "../src/domain/school-validation";
import {
  generateStudyPlan,
  normalizeAvailability,
  validateStudyPlan,
} from "../src/domain/study-plan/engine";
import { minutes, weekday } from "../src/domain/dates";
import type { PlanInput } from "../src/domain/types";
const school = () => parseSchoolData(structuredClone(seed));
const input = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  classId: "class-7a",
  studentName: "",
  startDate: "2026-09-21",
  endDate: "2026-10-18",
  priorities: [{ subjectId: "math", priorityRank: 1 }],
  availability: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime: "15:00",
    endTime: "17:00",
  })),
  ...overrides,
});
const sessions = (p: ReturnType<typeof generateStudyPlan>) =>
  p.weeks.flatMap((w) => w.sessions);
test("seed válido e sem dependências específicas no motor", () => {
  assert.equal(school().schoolYears.length, 3);
});
test("somente segunda 15–16 nunca gera em outro dia ou horário", () => {
  const p = generateStudyPlan(
    school(),
    input({
      availability: [{ weekday: 1, startTime: "15:00", endTime: "16:00" }],
    }),
  );
  assert.ok(sessions(p).length);
  for (const s of sessions(p)) {
    assert.equal(weekday(s.date), 1);
    assert.ok(s.startTime >= "15:00" && s.endTime <= "16:00");
  }
});
test("20 minutos não comportam sessão mínima de 30", () => {
  const p = generateStudyPlan(
    school(),
    input({
      availability: [{ weekday: 1, startTime: "15:00", endTime: "15:20" }],
    }),
  );
  assert.equal(sessions(p).length, 0);
  assert.ok(p.warnings.some((w) => w.code === "NO_SESSIONS"));
});
test("prioridade máxima aparece mais do que disciplinas não prioritárias sem eventos concorrentes", () => {
  const d = school();
  d.events = [];
  const p = generateStudyPlan(d, input());
  const all = sessions(p);
  const math = all.filter((s) => s.subjectId === "math").length;
  assert.ok(math > 0);
  for (const s of d.subjects.filter((s) => s.id !== "math"))
    assert.ok(
      math > all.filter((x) => x.subjectId === s.id).length,
      `${s.id} apareceu mais que MAT`,
    );
});
test("avaliação em 3 dias eleva GEO e aplica fase de prática", () => {
  const d = school();
  d.events = [
    {
      ...d.events[0],
      id: "exam",
      subjectId: "geography",
      eventTypeId: "assessment",
      startDate: "2026-09-24",
      endDate: "2026-09-24",
    },
  ];
  const p = generateStudyPlan(
    d,
    input({
      endDate: "2026-09-21",
      priorities: [],
      availability: [{ weekday: 1, startTime: "15:00", endTime: "19:00" }],
    }),
  );
  const s = sessions(p).find((s) => s.subjectId === "geography");
  assert.ok(s);
  assert.equal(s.eventId, "exam");
  assert.ok(
    s.breakdown.some((b) => b.code === "UPCOMING_EVENT" && b.value >= 100),
  );
  assert.equal(
    d.recipes.find((r) => r.id === s.recipeId)?.activityType,
    "practice",
  );
});
test("feriado bloqueia segunda-feira", () => {
  const d = school();
  d.events = [
    {
      ...d.events[0],
      eventTypeId: "holiday",
      subjectId: null,
      startDate: "2026-09-21",
      endDate: "2026-09-21",
    },
  ];
  const p = generateStudyPlan(d, input());
  assert.ok(!sessions(p).some((s) => s.date === "2026-09-21"));
});
test("mesmos dados geram o mesmo plano", () => {
  assert.deepEqual(
    generateStudyPlan(school(), input()),
    generateStudyPlan(school(), input()),
  );
});
test("LES e EVO presentes toda semana quando há capacidade", () => {
  const p = generateStudyPlan(school(), input());
  for (const w of p.weeks) {
    assert.ok(w.sessions.some((s) => s.resourceId === "les"));
    assert.ok(w.sessions.some((s) => s.resourceId === "evo"));
  }
});
test("não preenche todo o tempo livre e respeita limite diário", () => {
  const d = school(),
    p = generateStudyPlan(
      d,
      input({
        availability: [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          startTime: "15:00",
          endTime: "19:00",
        })),
      }),
    );
  for (const week of p.weeks) {
    assert.ok(
      week.sessions.reduce(
        (sum, s) => sum + minutes(s.endTime) - minutes(s.startTime),
        0,
      ) <= 600,
    );
    for (const date of new Set(week.sessions.map((s) => s.date)))
      assert.ok(
        week.sessions
          .filter((s) => s.date === date)
          .reduce(
            (sum, s) => sum + minutes(s.endTime) - minutes(s.startTime),
            0,
          ) <= 90,
      );
  }
});
test("sessões distribuídas entre todos os dias quando há alternativas", () => {
  const d = school();
  d.events = [];
  const p = generateStudyPlan(d, input({ endDate: "2026-09-25" }));
  assert.equal(new Set(sessions(p).map((s) => s.date)).size, 5);
});
test("slots sobrepostos são normalizados e não criam sobreposição", () => {
  const availability = [
    { weekday: 1, startTime: "15:00", endTime: "16:00" },
    { weekday: 1, startTime: "15:30", endTime: "17:00" },
  ];
  assert.deepEqual(normalizeAvailability(availability), [
    { weekday: 1, startTime: "15:00", endTime: "17:00" },
  ]);
  const p = generateStudyPlan(school(), input({ availability }));
  assert.ok(!p.warnings.some((w) => w.code === "OVERLAP"));
});
test("eventos de outra turma e outro ano não afetam o plano", () => {
  const d = school();
  d.events = [];
  const baseline = generateStudyPlan(d, input());
  d.events = [
    {
      ...school().events[0],
      id: "other",
      classId: "class-8a",
      schoolYearId: "year-8",
      subjectId: "geography",
    },
  ];
  assert.deepEqual(generateStudyPlan(d, input()), baseline);
});
test("regras editadas mudam a distribuição", () => {
  const d = school();
  d.events = [];
  const before = generateStudyPlan(d, input());
  d.rules.find((r) => r.code === "priority_subject_bonus")!.value = 300;
  const after = generateStudyPlan(d, input());
  assert.notDeepEqual(
    sessions(before).map((s) => s.subjectId),
    sessions(after).map((s) => s.subjectId),
  );
  assert.ok(
    sessions(after).filter((s) => s.subjectId === "math").length >
      sessions(before).filter((s) => s.subjectId === "math").length,
  );
});
test("falta de espaço retorna avisos em vez de inventar horários", () => {
  const p = generateStudyPlan(school(), input({ availability: [] }));
  assert.equal(sessions(p).length, 0);
  assert.ok(p.warnings.some((w) => w.code === "WEEKLY_RESOURCE_MISSING"));
});
test("validador detecta sessões inválidas", () => {
  const d = school(),
    p = generateStudyPlan(d, input());
  const s = sessions(p)[0];
  s.startTime = "06:00";
  s.endTime = "06:05";
  s.resourceId = "profedeele";
  const warnings = validateStudyPlan(d, p);
  assert.ok(warnings.some((w) => w.code === "OUTSIDE_AVAILABILITY"));
  assert.ok(warnings.some((w) => w.code === "MINIMUM_DURATION"));
  assert.ok(warnings.some((w) => w.code === "INVALID_RESOURCE"));
});
test("nomes de turmas, disciplinas e materiais podem mudar sem alterar o motor", () => {
  const d = school();
  d.subjects.find((s) => s.id === "math")!.name = "Raciocínio";
  d.resources.find((r) => r.id === "les")!.name = "Caderno semanal";
  d.classes.find((c) => c.id === "class-7a")!.code = "2027-X";
  assert.ok(sessions(generateStudyPlan(d, input())).length);
});
test("disponibilidade inválida e prioridade de outra turma são rejeitadas", () => {
  assert.throws(() =>
    generateStudyPlan(
      school(),
      input({
        availability: [{ weekday: 1, startTime: "19:00", endTime: "15:00" }],
      }),
    ),
  );
  assert.throws(() =>
    generateStudyPlan(
      school(),
      input({ priorities: [{ subjectId: "unknown", priorityRank: 1 }] }),
    ),
  );
});
