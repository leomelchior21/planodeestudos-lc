import test from "node:test";
import assert from "node:assert/strict";
import seed from "../data/seed/school-data.json";
import { parseSchoolData } from "../src/domain/school-validation";
import { prepareImport, readImportFile } from "../src/services/import-export";

test("CSV preserva vírgulas em títulos e detecta registros inválidos", async () => {
  const file = new File(['date,event_type,title,grade,class,subject\n2027-03-02,assessment,"Avaliação, etapa 1",7,7A,MAT\n'], 'calendar.csv', {type:'text/csv'});
  const rows = await readImportFile(file);
  const next = prepareImport(parseSchoolData(seed), 'events', rows);
  assert.equal(next.events.at(-1)?.title, 'Avaliação, etapa 1');
});

test("XLSX lê datas e códigos da primeira aba", async () => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Calendário');
  sheet.addRow(['date','event_type','title','grade','class','subject']);
  sheet.addRow([new Date('2027-03-02T12:00:00Z'),'assessment','Avaliação XLSX','7','7A','MAT']);
  const buffer = await workbook.xlsx.writeBuffer();
  const file = new File([new Uint8Array(buffer as ArrayBuffer)], 'calendar.xlsx');
  const rows = await readImportFile(file);
  const next = prepareImport(parseSchoolData(seed), 'events', rows);
  assert.equal(next.events.at(-1)?.startDate,'2027-03-02');
  assert.equal(next.events.at(-1)?.title,'Avaliação XLSX');
});

test("arquivo JSON restaura a configuração completa", async () => {
  const file = new File([JSON.stringify(seed)], 'school-data.json');
  assert.deepEqual(prepareImport(parseSchoolData(seed), 'backup', await readImportFile(file)), parseSchoolData(seed));
});
test("calendário resolve ano, turma e disciplina e importa idempotentemente", () => {
  const d = parseSchoolData(seed);
  const rows = [
    {
      date: "2027-03-02",
      event_type: "assessment",
      title: "Avaliação nova",
      grade: "7",
      class: "7A",
      subject: "MAT",
    },
  ];
  const next = prepareImport(d, "events", rows);
  const event = next.events.at(-1)!;
  assert.equal(event.schoolYearId, "year-7");
  assert.equal(event.subjectId, "math");
  assert.equal(event.classId, "class-7a");
  assert.equal(
    prepareImport(next, "events", rows).events.length,
    next.events.length,
  );
  assert.equal(d.events.length + 1, next.events.length);
});
test("importação rejeita referência e data inválidas sem mutação parcial", () => {
  const d = parseSchoolData(seed),
    before = JSON.stringify(d);
  assert.throws(() =>
    prepareImport(d, "events", [
      {
        date: "2027-02-30",
        event_type: "assessment",
        title: "Inválido",
        subject: "MAT",
      },
    ]),
  );
  assert.throws(() =>
    prepareImport(d, "events", [
      {
        date: "2027-02-20",
        event_type: "assessment",
        title: "Inválido",
        subject: "UNKNOWN",
      },
    ]),
  );
  assert.equal(JSON.stringify(d), before);
});
test("grade atualiza célula existente sem duplicar", () => {
  const d = parseSchoolData(seed);
  const next = prepareImport(d, "schedules", [
    {
      class: "7A",
      weekday: "monday",
      period: "1",
      start: "07:30",
      end: "08:20",
      subject: "MAT",
    },
  ]);
  assert.equal(next.schedules.length, d.schedules.length);
  assert.equal(
    next.schedules.find(
      (s) =>
        s.classId === "class-7a" && s.weekday === 1 && s.periodNumber === 1,
    )?.subjectId,
    "math",
  );
});
test("backup completo preserva os dados", () => {
  const d = parseSchoolData(seed);
  assert.deepEqual(
    prepareImport(d, "backup", JSON.parse(JSON.stringify(d))),
    d,
  );
});
