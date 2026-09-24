import { mkdirSync, writeFileSync } from "node:fs";
import type { SchoolData } from "../src/domain/types";
const schoolYears = [6, 7, 8].map((n, i) => ({
  id: `year-${n}`,
  name: `${n}º ano`,
  order: i,
  active: true,
}));
const classes = schoolYears.flatMap((y, i) =>
  ["A", "B", "C"].map((letter, order) => ({
    id: `class-${i + 6}${letter.toLowerCase()}`,
    schoolYearId: y.id,
    name: `Turma ${letter}`,
    code: `${i + 6}${letter}`,
    order,
    active: true,
  })),
);
const subjects = [
  ["math", "MAT", "Matemática", "Calculator", "#7755CC"],
  ["portuguese", "LP", "Língua Portuguesa", "BookOpen", "#CA6E87"],
  ["science", "CIE", "Ciências", "FlaskConical", "#4D9B8D"],
  ["geography", "GEO", "Geografia", "Globe2", "#5693BD"],
  ["history", "HIS", "História", "Landmark", "#B9854F"],
  ["english", "ING", "Inglês", "MessageCircle", "#9770B8"],
  ["spanish", "ESP", "Espanhol", "Languages", "#C17B54"],
].map(([id, code, name, icon, color]) => ({
  id,
  code,
  name,
  icon,
  color,
  active: true,
}));
const resources = [
  ["les", "LES", "Lista de exercícios da semana", ""],
  [
    "plurall",
    "Plurall",
    "Exercícios e revisão dos conteúdos",
    "https://www.plurall.net/",
  ],
  [
    "ngl",
    "National Geographic Learning",
    "Prática de língua inglesa",
    "https://eltngl.com/",
  ],
  [
    "profedeele",
    "Profedeele",
    "Atividades de língua espanhola",
    "https://www.profedeele.es/",
  ],
  ["evo", "EVO-Trilhas", "Trilhas de aprendizagem e revisão", ""],
].map(([id, name, description, url]) => ({
  id,
  name,
  description,
  url,
  active: true,
  weeklyMinimum: ["les", "evo"].includes(id) ? 1 : 0,
  preferredWeekdays: id === "evo" ? [3, 4, 5] : [1, 2, 3, 4, 5],
  mandatoryBonus: id === "les" ? 30 : 25,
}));
const mappings = [
  ["math", "les"],
  ["portuguese", "plurall"],
  ["science", "plurall"],
  ["geography", "plurall"],
  ["history", "plurall"],
  ["english", "ngl"],
  ["spanish", "profedeele"],
  ["science", "evo"],
];
const activities: SchoolData["activities"] = [];
const recipes: SchoolData["recipes"] = [];
for (const [subjectId, resourceId] of mappings)
  for (const activityType of ["practice", "review", "preparation"])
    for (const duration of [30, 60]) {
      const prefix = `${subjectId}-${resourceId}-${activityType}-${duration}`;
      const resource = resources.find((r) => r.id === resourceId)!;
      const instructions =
        activityType === "review"
          ? [
              "Releia os registros da aula e destaque as dúvidas.",
              `Revise as questões já resolvidas em ${resource.name}, com atenção aos erros.`,
              "Anote o que precisa perguntar na próxima aula.",
            ]
          : activityType === "preparation"
            ? [
                "Leia o roteiro e identifique os conteúdos que precisam de atenção.",
                `Retome exemplos de ${resource.name} e resolva três questões de aquecimento.`,
                "Marque os tópicos que precisam de mais prática.",
              ]
            : [
                "Revise suas anotações e os exemplos trabalhados em aula.",
                `Resolva pelo menos cinco exercícios em ${resource.name}.`,
                "Confira as respostas, refaça os erros e registre suas dúvidas.",
              ];
      const durations = duration === 30 ? [5, 20, 5] : [10, 40, 10];
      const steps = instructions.map((instruction, i) => {
        const id = `${prefix}-${i}`;
        activities.push({
          id,
          subjectId,
          resourceId,
          name: `${resource.name} · ${activityType} · etapa ${i + 1}`,
          instruction,
          durationMinutes: durations[i],
          activityType,
          difficulty: 1,
          priority: 1,
          active: true,
        });
        return {
          id: `step-${id}`,
          activityId: id,
          durationMinutes: durations[i],
          order: i,
        };
      });
      recipes.push({
        id: prefix,
        name: `${resource.name} · ${activityType === "practice" ? "Prática" : activityType === "review" ? "Revisão" : "Preparação"} · ${duration} min`,
        subjectId,
        resourceId,
        durationMinutes: duration,
        activityType,
        steps,
        active: true,
      });
    }
const rules = [
  [
    "priority_subject_bonus",
    "Prioridade do aluno",
    40,
    "Bônus da primeira disciplina prioritária.",
  ],
  [
    "priority_rank_step",
    "Intervalo entre prioridades",
    10,
    "Desconto a cada posição na lista de prioridades.",
  ],
  [
    "same_day_subject_bonus",
    "Aula no mesmo dia",
    25,
    "Reforça conteúdos estudados antes da sessão.",
  ],
  [
    "upcoming_event_bonus",
    "Avaliação próxima",
    35,
    "Bônus adicional durante o período de preparação.",
  ],
  [
    "repeat_subject_penalty",
    "Repetição na semana",
    -15,
    "Desconto por sessão da mesma disciplina na semana.",
  ],
  [
    "yesterday_penalty",
    "Estudada ontem",
    -20,
    "Favorece o espaçamento entre práticas.",
  ],
  [
    "not_recently_studied_bonus",
    "Prática espaçada",
    15,
    "Bônus para disciplinas não estudadas recentemente.",
  ],
  [
    "spaced_days",
    "Intervalo para prática espaçada",
    3,
    "Quantidade de dias sem estudar a disciplina.",
  ],
  [
    "daily_load_penalty",
    "Carga no mesmo dia",
    -30,
    "Desconto por sessão já alocada no dia.",
  ],
  [
    "preferred_day_bonus",
    "Dia preferido do material",
    15,
    "Bônus para cumprir um material no dia recomendado.",
  ],
  [
    "activity_match_bonus",
    "Atividade recomendada",
    15,
    "Bônus da receita compatível com a fase do evento.",
  ],
  [
    "resource_priority_penalty",
    "Preferência de material",
    5,
    "Desconto para materiais de prioridade secundária.",
  ],
].map(([code, name, value, description]) => ({
  id: String(code),
  code: String(code),
  name: String(name),
  value: Number(value),
  description: String(description),
  active: true,
}));
const eventTypes = [
  ["assessment", "Avaliação", 40, 14, "#7955BC", false],
  ["project", "Projeto", 30, 14, "#539888", false],
  ["study_guide", "Roteiro de estudos", 20, 7, "#AC8652", false],
  ["recovery", "Recuperação", 45, 14, "#C07070", false],
  ["holiday", "Feriado", 0, 0, "#88909B", true],
  ["school_event", "Evento escolar", 0, 0, "#7088B1", false],
].map(([id, name, studyWeight, preparationDays, color, blocksStudy]) => ({
  id: String(id),
  code: String(id),
  name: String(name),
  studyWeight: Number(studyWeight),
  preparationDays: Number(preparationDays),
  color: String(color),
  icon: "CalendarDays",
  blocksStudy: Boolean(blocksStudy),
}));
const events = [
  ["2026-09-28", "AP de Matemática", "assessment", "math"],
  ["2026-10-02", "Entrega de projeto de Geografia", "project", "geography"],
  ["2026-10-08", "Avaliação de Ciências", "assessment", "science"],
  ["2026-10-12", "Nossa Senhora Aparecida", "holiday", null],
  ["2026-10-15", "Roteiro de Língua Portuguesa", "study_guide", "portuguese"],
  ["2026-10-20", "AP de Geografia", "assessment", "geography"],
  ["2026-11-02", "Finados", "holiday", null],
].map(([date, title, eventTypeId, subjectId], i) => ({
  id: `event-${i}`,
  title: title!,
  description:
    "Dado de demonstração. Substitua pelo calendário validado da escola.",
  eventTypeId: eventTypeId!,
  startDate: date!,
  endDate: date!,
  schoolYearId: null,
  classId: null,
  subjectId,
  importance: 3,
  affectsStudyPlan: true,
  metadata: { sample: true },
}));
const data: SchoolData = {
  version: 1,
  settings: {
    schoolName: "Lourenço Castanho",
    academicYear: 2026,
    planDefaultWeeks: 4,
    minimumStudyMinutes: 30,
    maxStudyMinutesPerDay: 90,
    targetStudyLoadPercentage: 0.5,
    availabilitySlotMinutes: 30,
    weekdays: [1, 2, 3, 4, 5],
    startTime: "14:00",
    endTime: "19:00",
    allowHolidays: false,
  },
  schoolYears,
  classes,
  subjects,
  classSubjects: classes.flatMap((c) =>
    subjects.map((s) => ({
      id: `${c.id}-${s.id}`,
      classId: c.id,
      subjectId: s.id,
    })),
  ),
  schedules: classes.flatMap((c, ci) =>
    [1, 2, 3, 4, 5].flatMap((day) =>
      Array.from({ length: 5 }, (_, period) => ({
        id: `${c.id}-${day}-${period}`,
        classId: c.id,
        weekday: day,
        periodNumber: period + 1,
        startTime: `${String(7 + Math.floor((30 + period * 50) / 60)).padStart(2, "0")}:${String((30 + period * 50) % 60).padStart(2, "0")}`,
        endTime: `${String(7 + Math.floor((80 + period * 50) / 60)).padStart(2, "0")}:${String((80 + period * 50) % 60).padStart(2, "0")}`,
        subjectId: subjects[(day * 2 + period + ci) % subjects.length].id,
      })),
    ),
  ),
  eventTypes,
  events,
  resources,
  subjectResources: mappings.map(([subjectId, resourceId], i) => ({
    id: `mapping-${i}`,
    subjectId,
    resourceId,
    priority: resourceId === "evo" ? 2 : 1,
  })),
  activities,
  recipes,
  rules,
  phases: [
    [10, 14, 5, "preparation"],
    [5, 9, 15, "practice"],
    [2, 4, 30, "practice"],
    [0, 1, 40, "review"],
  ].map(([min, max, weight, type], i) => ({
    id: `phase-${i}`,
    eventTypeId: "assessment",
    daysBeforeMin: Number(min),
    daysBeforeMax: Number(max),
    weight: Number(weight),
    recommendedActivityType: String(type),
  })),
  reasonTemplates: [
    ["PRIORITY_SUBJECT", "Você escolheu esta disciplina como uma prioridade."],
    ["SAME_DAY_CLASS", "Você teve esta disciplina na escola hoje."],
    [
      "UPCOMING_EVENT",
      "Um evento próximo pede um pouco mais de atenção a este conteúdo.",
    ],
    [
      "SPACED_PRACTICE",
      "Retomar o conteúdo depois de alguns dias ajuda a fixar o aprendizado.",
    ],
    [
      "WEEKLY_RESOURCE",
      "Este material faz parte das atividades semanais recomendadas pela escola.",
    ],
  ].map(([code, text]) => ({ id: code, code, text })),
};
mkdirSync("data/seed", { recursive: true });
const filenames: Record<string, string> = {
  schoolYears: "school-years",
  classes: "classes",
  subjects: "subjects",
  classSubjects: "class-subjects",
  schedules: "class-schedules",
  events: "academic-events",
  eventTypes: "event-types",
  resources: "study-resources",
  subjectResources: "subject-resources",
  activities: "study-activity-templates",
  recipes: "study-recipes",
  rules: "study-rules",
  phases: "event-study-phases",
  reasonTemplates: "reason-templates",
  settings: "school-settings",
};
for (const [key, file] of Object.entries(filenames))
  writeFileSync(
    `data/seed/${file}.json`,
    JSON.stringify(data[key as keyof SchoolData], null, 2) + "\n",
  );
writeFileSync(
  "data/seed/school-data.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log("Dados de demonstração gravados em data/seed.");
