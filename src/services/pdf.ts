import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SavedPlan } from "@/domain/types";
import { formatDate, minutes } from "@/domain/dates";
export function downloadPlanPdf({ plan, school }: SavedPlan) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const shrink = (value: number) => Math.round(value * 0.8 * 10) / 10;
  const columnSize = Math.round(shrink(9) * 0.8 * 10) / 10;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const cls = school.classes.find((c) => c.id === plan.classId)!;
  const year = school.schoolYears.find((y) => y.id === cls.schoolYearId)!;
  const sessions = plan.weeks.flatMap((week) => week.sessions);
  const duration = sessions.reduce(
    (sum, s) => sum + minutes(s.endTime) - minutes(s.startTime),
    0,
  );
  const header = () => {
    doc.setFillColor(100, 62, 175);
    doc.rect(0, 0, width, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(shrink(20));
    doc.setTextColor(55, 38, 84);
    doc.text("PLANO DE ESTUDOS", 12, 17);
    const studentLine = [
      plan.studentName || "Estudante",
      `${year.name} · ${cls.name}`,
      `Período: ${formatDate(plan.startDate)} a ${formatDate(plan.endDate)}`,
      `${sessions.length} sessões · ${Math.floor(duration / 60)}h${
        duration % 60 ? `${duration % 60}min` : ""
      }`,
      `Elaborado em ${formatDate(plan.createdAt.slice(0, 10))}`,
    ].join("  •  ");
    doc.setFont("helvetica", "normal");
    let infoSize = shrink(10);
    doc.setFontSize(infoSize);
    while (doc.getTextWidth(studentLine) > width - 24 && infoSize > 5.5) {
      infoSize = Math.round((infoSize - 0.2) * 10) / 10;
      doc.setFontSize(infoSize);
    }
    doc.setTextColor(90);
    doc.text(studentLine, 12, 24);
  };
  const body: string[][] = [];
  plan.weeks.forEach((week, index) => {
    if (!week.sessions.length) {
      body.push([
        `Semana ${index + 1}`,
        "—",
        "—",
        "—",
        "—",
        "Nenhuma sessão disponível nesta semana.",
      ]);
      return;
    }
    for (const s of week.sessions)
      body.push([
        `Semana ${index + 1}`,
        formatDate(s.date, {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }),
        `${s.startTime}–${s.endTime}`,
        school.subjects.find((v) => v.id === s.subjectId)?.name ?? s.subjectId,
        school.resources.find((v) => v.id === s.resourceId)?.name ??
          "Estudo orientado",
        s.steps.map((step, i) => `${i + 1}. ${step.instruction}`).join(" "),
      ]);
  });
  autoTable(doc, {
    startY: 30,
    margin: { left: 12, right: 12, top: 30, bottom: 12 },
    head: [
      ["Semana", "Data", "Horário", "Disciplina", "Material", "Passo a passo"],
    ],
    body,
    styles: {
      fontSize: shrink(9),
      cellPadding: 1.8,
      overflow: "linebreak",
      valign: "top",
      lineColor: [226, 218, 238],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [100, 62, 175],
      fontSize: shrink(9),
      cellPadding: 1.8,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [247, 245, 251] },
    columnStyles: {
      0: { cellWidth: 17, fontStyle: "bold" },
      1: { cellWidth: 22, fontSize: columnSize },
      2: { cellWidth: 19, fontSize: columnSize },
      3: { cellWidth: 30, fontSize: columnSize },
      4: { cellWidth: 29, fontSize: columnSize },
      5: { cellWidth: "auto" },
    },
    rowPageBreak: "avoid",
    didDrawPage: header,
  });
  if (plan.warnings.length) {
    doc.addPage();
    header();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(shrink(13));
    doc.setTextColor(55, 38, 84);
    doc.text("ORIENTAÇÕES E AJUSTES", 12, 31);
    autoTable(doc, {
      startY: 35,
      margin: { left: 12, right: 12, top: 30, bottom: 12 },
      head: [["Observações"]],
      body: plan.warnings.map((w) => [
        `${w.week ? `Semana de ${formatDate(w.week)}: ` : ""}${w.message}`,
      ]),
      styles: {
        fontSize: shrink(9),
        cellPadding: 1.8,
        lineColor: [226, 218, 238],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [100, 62, 175],
        fontSize: shrink(9),
        cellPadding: 1.8,
      },
      didDrawPage: header,
    });
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(shrink(8));
    doc.setTextColor(130);
    doc.text(
      "Um pouco a cada dia. O plano pode ser ajustado com a orientação da escola.",
      12,
      height - 7,
    );
    doc.text(`${page} / ${doc.getNumberOfPages()}`, width - 12, height - 7, {
      align: "right",
    });
  }
  doc.save(`plano-de-estudos-${cls.code}-${plan.startDate}.pdf`);
}
