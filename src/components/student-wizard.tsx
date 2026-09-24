"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Layers,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Shell, Progress } from "./shell";
import { StudentHero } from "./student-hero";
import { SubjectIcon } from "./icons";
import { AvailabilityGrid, slotsToAvailability } from "./availability-grid";
import type { SchoolData } from "@/domain/types";
import { addDays, today } from "@/domain/dates";

export function StudentWizard({
  school,
  simulator = false,
}: {
  school: SchoolData;
  simulator?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [year, setYear] = useState("");
  const [classId, setClassId] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [studentName, setName] = useState("");
  const [startDate, setStart] = useState(today());
  const [endDate, setEnd] = useState(
    addDays(today(), school.settings.planDefaultWeeks * 7 - 1),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const years = school.schoolYears
    .filter((y) => y.active)
    .sort((a, b) => a.order - b.order);
  const classes = school.classes
    .filter((c) => c.schoolYearId === year && c.active)
    .sort((a, b) => a.order - b.order);
  const subjects = school.subjects.filter(
    (s) =>
      s.active &&
      school.classSubjects.some(
        (c) => c.classId === classId && c.subjectId === s.id,
      ),
  );
  const selectedClass = school.classes.find((c) => c.id === classId);
  const selectYear = (id: string) => {
    setYear(id);
    setClassId("");
    setPriorities([]);
  };
  const move = (index: number, delta: number) => {
    const list = [...priorities];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    setPriorities(list);
  };
  async function generate() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          studentName,
          startDate,
          endDate,
          priorities: priorities.map((subjectId, i) => ({
            subjectId,
            priorityRank: i + 1,
          })),
          availability: slotsToAvailability(slots, school.settings),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(`/plan/${result.id}${simulator ? "?debug=true" : ""}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gerar o plano.",
      );
      setBusy(false);
    }
  }
  const heading = [
    "Primeiro, vamos nos conhecer.",
    "O que merece mais atenção?",
    "Vamos encontrar o seu tempo.",
  ][step];
  const subtitle = [
    "Diga seu nome e escolha seu ano e sua turma para começar.",
    "Escolha as matérias que deseja priorizar no seu plano.",
    "Selecione apenas os horários que você consegue cumprir.",
  ][step];
  const content = (
    <main className={`student-main wizard-step-${step}`}>
      <StudentHero
        step={step}
        academicYear={school.settings.academicYear}
        simulator={simulator}
      />
      <Progress step={step} />
      <div className="wizard-layout">
        <section className="wizard-card" aria-labelledby="step-title">
          <div className="card-heading">
            <span className="section-icon">
              {step === 0 ? (
                <GraduationCap />
              ) : step === 1 ? (
                <Star />
              ) : (
                <Clock3 />
              )}
            </span>
            <div>
              <span className="overline">
                PASSO {String(step + 1).padStart(2, "0")} DE 03
              </span>
              <h2 id="step-title">{heading}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="step-content" key={step}>
            {step === 0 ? (
              <div className="student-basics">
                <div className="basics-panel name-panel">
                  <label htmlFor="student-name">Seu nome</label>
                  <input
                    id="student-name"
                    name="studentName"
                    autoComplete="name"
                    value={studentName}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Como podemos chamar você?"
                    required
                  />
                </div>
                <div className="basics-panel">
                  <div className="field-heading">
                    <Layers size={18} />
                    <h3>Qual é o seu ano?</h3>
                  </div>
                  <div className="year-options">
                    {years.map((y, index) => (
                      <button
                        key={y.id}
                        className={`year-card ${year === y.id ? "selected" : ""}`}
                        aria-pressed={year === y.id}
                        onClick={() => selectYear(y.id)}
                      >
                        <span className="selection-check">
                          {year === y.id && <Check size={13} />}
                        </span>
                        <Layers size={32} strokeWidth={1.5} />
                        <strong>{y.name}</strong>
                        <small>
                          {
                            [
                              "Novas descobertas",
                              "Novas possibilidades",
                              "Novos caminhos",
                            ][index % 3]
                          }
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="basics-panel class-panel">
                  <div className="field-heading class-heading">
                    <Users size={18} />
                    <h3>Qual é a sua turma?</h3>
                  </div>
                  {year ? (
                    <div className="class-options">
                      {classes.map((c) => (
                        <button
                          key={c.id}
                          aria-pressed={classId === c.id}
                          className={`class-card ${classId === c.id ? "selected" : ""}`}
                          onClick={() => {
                            setClassId(c.id);
                            setPriorities([]);
                          }}
                        >
                          {c.name}
                          {classId === c.id && <Check size={15} />}
                        </button>
                      ))}
                      {!classes.length && (
                        <p className="muted">Nenhuma turma ativa neste ano.</p>
                      )}
                    </div>
                  ) : (
                    <div className="empty-class">
                      Selecione seu ano para ver as turmas disponíveis.
                    </div>
                  )}
                </div>
                <div className="inline-tip basics-tip">
                  <Lightbulb size={18} />
                  <span>
                    O plano acompanha as aulas e o calendário da sua turma.
                  </span>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="priorities-layout">
                <div className="subject-grid">
                  {subjects.map((s) => {
                    const selected = priorities.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        className={`subject-card ${selected ? "selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() =>
                          setPriorities(
                            selected
                              ? priorities.filter((id) => id !== s.id)
                              : [...priorities, s.id],
                          )
                        }
                      >
                        <span className="selection-check">
                          {selected && <Check size={12} />}
                        </span>
                        <SubjectIcon name={s.icon} size={27} />
                        <strong>{s.code}</strong>
                        <small>{s.name}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="priorities-box">
                  <div className="field-heading">
                    <Star size={19} />
                    <h3>Suas prioridades</h3>
                    <span className="small muted">Da maior para a menor</span>
                  </div>
                  {priorities.length ? (
                    priorities.map((id, i) => (
                      <div className="priority-row" key={id}>
                        <span className="priority-number">{i + 1}</span>
                        <strong>
                          {school.subjects.find((s) => s.id === id)?.name}
                        </strong>
                        <button
                          className="icon-button"
                          aria-label={`Subir ${school.subjects.find((s) => s.id === id)?.name}`}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Descer ${school.subjects.find((s) => s.id === id)?.name}`}
                          disabled={i === priorities.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="muted small">
                      Selecione suas matérias acima. Você também pode seguir com
                      um plano equilibrado.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <AvailabilityGrid
                  settings={school.settings}
                  value={slots}
                  onChange={setSlots}
                />
                <div className="inline-tip">
                  <Lightbulb size={18} />
                  <span>
                    Tempo livre também é para descansar. Seu plano usará cerca
                    de{" "}
                    {Math.round(
                      school.settings.targetStudyLoadPercentage * 100,
                    )}
                    % da disponibilidade.
                  </span>
                </div>
                <details className="period-options">
                  <summary>
                    Personalizar período <ChevronRight size={14} />
                  </summary>
                  <div className="form-grid">
                    <label>
                      Início
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </label>
                    <label>
                      Fim
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </label>
                  </div>
                </details>
              </>
            )}
          </div>
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <div className="wizard-actions">
            {step > 0 ? (
              <button
                className="button ghost"
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                <ArrowLeft size={17} /> Voltar
              </button>
            ) : (
              <span className="action-note">
                <Clock3 size={15} /> Pronto em poucos minutos
              </span>
            )}
            <button
              className="button primary"
              disabled={
                busy ||
                (step === 0 && (!classId || !studentName.trim())) ||
                (step === 2 && !slots.length)
              }
              onClick={() => (step < 2 ? setStep(step + 1) : generate())}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={18} /> Organizando seu
                  plano
                </>
              ) : (
                <>
                  {step === 2
                    ? "Gerar meu plano"
                    : step === 1
                      ? "Definir horários"
                      : "Continuar"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </section>
        <aside className="wizard-aside">
          <div className="inspiration-card">
            <div className="aside-chip">
              <Sparkles size={13} /> SEU PRÓXIMO PASSO
            </div>
            <h2>
              Pequenos passos.
              <br />
              <span>Grandes conquistas.</span>
            </h2>
            <p>Um plano que combina com o seu jeito de aprender.</p>
            <div className="aside-divider" />
            <div className="benefit">
              <span>
                <CalendarDays size={17} />
              </span>
              <div>
                <strong>Conectado à sua rotina</strong>
                <small>Suas aulas e avaliações no mesmo plano.</small>
              </div>
            </div>
            <div className="benefit">
              <span>
                <Clock3 size={17} />
              </span>
              <div>
                <strong>No seu ritmo</strong>
                <small>Tempo para estudar. E para ser você.</small>
              </div>
            </div>
            <div className="benefit">
              <span>
                <Star size={17} />
              </span>
              <div>
                <strong>Foco no que importa</strong>
                <small>Mais atenção às suas prioridades.</small>
              </div>
            </div>
          </div>
          <div className="aside-note">
            <ShieldCheck size={17} />
            <p>
              Um plano orientado pelas recomendações pedagógicas da sua escola.
            </p>
          </div>
          {selectedClass && (
            <div className="chosen-class">
              <Check size={14} />
              {school.schoolYears.find((y) => y.id === year)?.name} ·{" "}
              {selectedClass.name}
            </div>
          )}
        </aside>
      </div>
      <div className="bottom-note">
        <span>✦</span> Você não precisa estudar mais. Precisa encontrar o seu
        jeito.
      </div>
    </main>
  );
  return simulator ? (
    content
  ) : (
    <Shell schoolName={school.settings.schoolName}>{content}</Shell>
  );
}
