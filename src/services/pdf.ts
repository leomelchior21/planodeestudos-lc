import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SavedPlan } from "@/domain/types";
import { formatDate } from "@/domain/dates";
export function downloadPlanPdf({ plan, school }: SavedPlan) {
  const doc = new jsPDF();
  const cls = school.classes.find((c) => c.id === plan.classId)!;
  const year = school.schoolYears.find((y) => y.id === cls.schoolYearId)!;
  const header = () => {
    doc.setFillColor(100, 62, 175);
    doc.rect(0, 0, 210, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(55, 38, 84);
    doc.text("PLANO DE ESTUDOS", 16, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90);
    doc.text(school.settings.schoolName, 16, 33);
    doc.text(
      `${plan.studentName || "Estudante"} | ${year.name} - ${cls.name}`,
      16,
      42,
    );
    doc.text(
      `Período: ${formatDate(plan.startDate)} a ${formatDate(plan.endDate)} | Elaborado em: ${formatDate(plan.createdAt.slice(0, 10))}`,
      16,
      49,
    );
  };
  plan.weeks.forEach((week, index) => {
    if (index) doc.addPage();
    header();
    doc.setFontSize(12);
    doc.setTextColor(100, 62, 175);
    doc.text(
      `SEMANA ${index + 1} | ${formatDate(week.startDate)} a ${formatDate(week.endDate)}`,
      16,
      62,
    );
    autoTable(doc, {
      startY: 68,
      margin: { left: 16, right: 16, top: 18, bottom: 20 },
      head: [["Data", "Horário", "Objetivos e atividades"]],
      body: week.sessions.map((s) => [
        formatDate(s.date, {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }),
        `${s.startTime} - ${s.endTime}`,
        `${school.subjects.find((v) => v.id === s.subjectId)?.name} | ${school.resources.find((v) => v.id === s.resourceId)?.name ?? "Estudo orientado"}\n${s.steps.map((step) => `${step.minutes} min: ${step.instruction}`).join("\n")}`,
      ]),
      styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [100, 62, 175] },
      alternateRowStyles: { fillColor: [247, 245, 251] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 31 },
        2: { cellWidth: 119 },
      },
      rowPageBreak: "avoid",
    });
    if (!week.sessions.length) {
      doc.setTextColor(90);
      doc.text("Nenhuma sessão disponível nesta semana.", 16, 85);
    }
  });
  if (plan.warnings.length) {
    doc.addPage();
    header();
    doc.setFontSize(13);
    doc.text("ORIENTAÇÕES E AJUSTES", 16, 63);
    autoTable(doc, {
      startY: 70,
      margin: 16,
      head: [["Observações"]],
      body: plan.warnings.map((w) => [
        `${w.week ? `Semana de ${formatDate(w.week)}: ` : ""}${w.message}`,
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [100, 62, 175] },
    });
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(
      "Um pouco a cada dia. O plano pode ser ajustado com a orientação da escola.",
      16,
      287,
    );
    doc.text(`${page} / ${doc.getNumberOfPages()}`, 185, 287);
  }
  doc.save(`plano-de-estudos-${cls.code}-${plan.startDate}.pdf`);
}
