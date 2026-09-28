import test from "node:test";
import assert from "node:assert/strict";
import seed from "../data/seed/school-data.json";
import { parseSchoolData } from "../src/domain/school-validation";
import {
  buildOptionalSessionSteps,
  buildSessionSteps,
  mergeConsecutiveSessions,
} from "../src/domain/study-plan/sessions";
import type { StudySession } from "../src/domain/types";

const school = () => parseSchoolData(structuredClone(seed));
const session = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: "session",
  date: "2026-09-28",
  startTime: "15:00",
  endTime: "15:30",
  subjectId: "math",
  resourceId: "les",
  recipeId: "math-les-practice-30",
  reasonCodes: [],
  reasons: [],
  score: 0,
  breakdown: [],
  steps: [],
  ...overrides,
});

test("os passos da sessão respeitam o tempo disponível", () => {
  const data = school();
  const halfHour = buildSessionSteps(data, "math-les-practice-30", 30);
  assert.equal(halfHour.length, 1);
  assert.equal(halfHour[0].minutes, 30);
  const fullHour = buildSessionSteps(data, "math-les-practice-60", 60);
  assert.deepEqual(
    fullHour.map((step) => step.minutes),
    [30, 30],
  );
  const english = buildSessionSteps(data, "english-ngl-practice-60", 60);
  assert.deepEqual(
    english.map((step) => step.minutes),
    [30, 15, 15],
  );
  for (const recipe of data.recipes) {
    const steps = buildSessionSteps(data, recipe.id, recipe.durationMinutes);
    assert.ok(steps.length >= 1, `${recipe.id} sem etapas`);
    assert.ok(
      steps.reduce((sum, step) => sum + step.minutes, 0) <=
        recipe.durationMinutes,
      `${recipe.id} excedeu a duração`,
    );
  }
});

test("pontos que não cabem no tempo ficam como opcionais", () => {
  const data = school();
  const optional = buildOptionalSessionSteps(data, "math-les-practice-60", 60);
  assert.deepEqual(
    optional.map((step) => step.minutes),
    [30],
  );
  assert.match(optional[0].instruction, /EVO Trilha/);
  assert.equal(
    buildOptionalSessionSteps(data, "math-les-practice-60", 120).length,
    0,
  );
});

test("matérias com 4 ou mais pontos têm receitas de 90 minutos", () => {
  const data = school();
  for (const subjectId of [
    "portuguese",
    "science",
    "biology",
    "physics",
    "geography",
    "history",
  ]) {
    assert.ok(
      data.recipes.some(
        (r) => r.durationMinutes === 90 && r.subjectId === subjectId,
      ),
      `${subjectId} sem receita de 90 min`,
    );
  }
  for (const subjectId of ["math", "english", "spanish"])
    assert.ok(
      !data.recipes.some(
        (r) => r.durationMinutes === 90 && r.subjectId === subjectId,
      ),
      `${subjectId} não deveria ter receita de 90 min`,
    );
});

test("sessões consecutivas da mesma matéria e material são agrupadas", () => {
  const merged = mergeConsecutiveSessions([
    session({ id: "a" }),
    session({ id: "b", startTime: "15:30", endTime: "16:00" }),
    session({
      id: "c",
      subjectId: "geography",
      resourceId: "plurall",
      startTime: "16:00",
      endTime: "16:30",
    }),
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].startTime, "15:00");
  assert.equal(merged[0].endTime, "16:00");
  assert.equal(merged[1].subjectId, "geography");
});

test("materiais diferentes ou intervalos não são agrupados", () => {
  const merged = mergeConsecutiveSessions([
    session({ id: "a" }),
    session({ id: "b", resourceId: "evo", startTime: "15:30", endTime: "16:00" }),
    session({ id: "c", startTime: "16:30", endTime: "17:00" }),
  ]);
  assert.equal(merged.length, 3);
});
