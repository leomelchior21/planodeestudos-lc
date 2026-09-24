import Papa from "papaparse";
import type { SchoolData } from "@/domain/types";
import { parseSchoolData } from "@/domain/school-validation";
export function downloadText(
  filename: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportSchoolData(data: SchoolData) {
  downloadText("school-data.json", JSON.stringify(data, null, 2));
}
export function importSchoolData(input: unknown) {
  return parseSchoolData(input);
}
export type ImportKind = "events" | "schedules" | "resources" | "backup";
export const importTemplates: Record<Exclude<ImportKind, "backup">, string> = {
  events:
    "date,event_type,title,grade,class,subject\n2026-10-20,assessment,AP4,7,,MAT\n2026-10-28,study_guide,Roteiro AB4,7,,GEO\n",
  schedules:
    "class,weekday,period,start,end,subject\n7A,monday,1,07:30,08:20,GEO\n7A,monday,2,08:20,09:10,MAT\n",
  resources:
    "subject,resource,url\nMAT,LES,\nGEO,Plurall,https://www.plurall.net/\nING,National Geographic Learning,https://eltngl.com/\n",
};
export async function readImportFile(file: File): Promise<unknown> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("O arquivo deve ter no máximo 5 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "json") return JSON.parse(await file.text());
  if (ext === "csv") {
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
    });
    if (parsed.errors.length)
      throw new Error(parsed.errors.map((e) => e.message).join("; "));
    return parsed.data;
  }
  if (ext === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("Planilha vazia.");
    if (sheet.rowCount > 5000)
      throw new Error("Máximo de 5.000 linhas por importação.");
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => {
      headers[col] = String(cell.value ?? "").trim();
    });
    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const item: Record<string, string> = {};
      row.eachCell((cell, col) => {
        if (headers[col])
          item[headers[col]] =
            cell.value instanceof Date
              ? cell.value.toISOString().slice(0, 10)
              : cell.text;
      });
      rows.push(item);
    });
    return rows;
  }
  throw new Error("Use um arquivo CSV, XLSX ou JSON.");
}
export function prepareImport(
  data: SchoolData,
  kind: ImportKind,
  input: unknown,
): SchoolData {
  if (kind === "backup") return importSchoolData(input);
  if (!Array.isArray(input) || input.length > 5000)
    throw new Error("Esperada uma lista com até 5.000 registros.");
  const next = structuredClone(data);
  const resolve = (
    list: { id: string; name?: string; code?: string }[],
    value: unknown,
    label: string,
    optional = false,
  ) => {
    if (!value && optional) return null;
    const text = String(value ?? "").trim();
    const match = list.find(
      (v) => v.id === text || v.code === text || v.name === text,
    );
    if (!match)
      throw new Error(`${label} não encontrado: ${text || "(vazio)"}`);
    return match.id;
  };
  input.forEach((row, index) => {
    if (typeof row !== "object" || row === null)
      throw new Error(`Linha ${index + 2}: registro inválido`);
    try {
      if (kind === "events") {
        const grade = row.grade
          ? String(row.grade)
              .replace(/º?\s*ano$/, "")
              .trim()
          : "";
        const schoolYearId = grade
          ? resolve(
              next.schoolYears,
              next.schoolYears.find(
                (y) =>
                  y.id === grade ||
                  y.name === String(row.grade) ||
                  y.name.replace(/º?\s*ano$/, "").trim() === grade,
              )?.id,
              "Ano",
            )
          : null;
        const event = {
          id: String(row.id || crypto.randomUUID()),
          title: String(row.title ?? ""),
          description: String(row.description ?? ""),
          eventTypeId: resolve(
            next.eventTypes,
            row.event_type ?? row.eventTypeId,
            "Tipo de evento",
          )!,
          startDate: String(row.date ?? row.startDate ?? ""),
          endDate: String(
            row.end_date ?? row.endDate ?? row.date ?? row.startDate ?? "",
          ),
          schoolYearId,
          classId: resolve(
            next.classes,
            row.class ?? row.classId,
            "Turma",
            true,
          ),
          subjectId: resolve(
            next.subjects,
            row.subject ?? row.subjectId,
            "Disciplina",
            true,
          ),
          importance: Number(row.importance ?? 3),
          affectsStudyPlan: row.affects_study_plan !== "false",
          metadata: { imported: true },
        };
        const existing = next.events.findIndex(
          (e) =>
            e.id === event.id ||
            (e.title === event.title &&
              e.startDate === event.startDate &&
              e.classId === event.classId &&
              e.schoolYearId === event.schoolYearId &&
              e.subjectId === event.subjectId),
        );
        if (existing >= 0) next.events[existing] = event;
        else next.events.push(event);
      } else if (kind === "schedules") {
        const weekdays: Record<string, number> = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
          domingo: 0,
          segunda: 1,
          terça: 2,
          quarta: 3,
          quinta: 4,
          sexta: 5,
          sábado: 6,
        };
        const weekday =
          weekdays[String(row.weekday).toLowerCase()] ?? Number(row.weekday);
        const classId = resolve(
          next.classes,
          row.class ?? row.classId,
          "Turma",
        )!;
        const subjectId = resolve(
          next.subjects,
          row.subject ?? row.subjectId,
          "Disciplina",
        )!;
        const periodNumber = Number(row.period ?? row.periodNumber);
        const existing = next.schedules.findIndex(
          (s) =>
            s.classId === classId &&
            s.weekday === weekday &&
            s.periodNumber === periodNumber,
        );
        const schedule = {
          id: existing >= 0 ? next.schedules[existing].id : crypto.randomUUID(),
          classId,
          subjectId,
          weekday,
          periodNumber,
          startTime: String(row.start ?? row.startTime),
          endTime: String(row.end ?? row.endTime),
        };
        if (existing >= 0) next.schedules[existing] = schedule;
        else next.schedules.push(schedule);
        if (
          !next.classSubjects.some(
            (c) => c.classId === classId && c.subjectId === subjectId,
          )
        )
          next.classSubjects.push({
            id: crypto.randomUUID(),
            classId,
            subjectId,
          });
      } else {
        const subjectId = resolve(
          next.subjects,
          row.subject ?? row.subjectId,
          "Disciplina",
        )!;
        const name = String(row.resource ?? row.name ?? "");
        if (!name) throw new Error("Nome do material é obrigatório");
        let resource = next.resources.find((r) => r.name === name);
        if (resource) resource.url = String(row.url ?? "");
        else {
          resource = {
            id: crypto.randomUUID(),
            name,
            url: String(row.url ?? ""),
            description: "",
            active: true,
            weeklyMinimum: 0,
            preferredWeekdays: [],
            mandatoryBonus: 0,
          };
          next.resources.push(resource);
        }
        if (
          !next.subjectResources.some(
            (r) => r.subjectId === subjectId && r.resourceId === resource.id,
          )
        )
          next.subjectResources.push({
            id: crypto.randomUUID(),
            subjectId,
            resourceId: resource.id,
            priority: 1,
          });
      }
    } catch (e) {
      throw new Error(
        `Linha ${index + 2}: ${e instanceof Error ? e.message : "Dados inválidos"}`,
      );
    }
  });
  return parseSchoolData(next);
}
