"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Flag,
  Info,
  List,
  Sparkles,
} from "lucide-react";
import type { SavedPlan, StudySession } from "@/domain/types";
import { formatDate, minutes } from "@/domain/dates";
import { relevantEvents } from "@/domain/study-plan/engine";
import { Shell, Progress } from "./shell";
import { SubjectIcon } from "./icons";
import { PlanCelebration } from "./student-hero";
export function PlanView({
  saved,
  debug = false,
}: {
  saved: SavedPlan;
  debug?: boolean;
}) {
  const { school, plan } = saved;
  const [full, setFull] = useState(false);
  const [weekIndex, setWeek] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cls = school.classes.find((c) => c.id === plan.classId)!;
  const year = school.schoolYears.find((y) => y.id === cls.schoolYearId)!;
  const events = relevantEvents(school, plan.classId)
    .filter((e) => e.endDate >= plan.startDate && e.startDate <= plan.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const total = plan.weeks.flatMap((w) => w.sessions);
  const duration = total.reduce(
    (n, s) => n + minutes(s.endTime) - minutes(s.startTime),
    0,
  );
  async function pdf() {
    setBusy(true);
    try {
      const { downloadPlanPdf } = await import("@/services/pdf");
      downloadPlanPdf(saved);
    } catch {
      setError("Não foi possível baixar o PDF. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  function sessionCard(s: StudySession) {
    const subject = school.subjects.find((v) => v.id === s.subjectId)!;
    const resource = school.resources.find((v) => v.id === s.resourceId);
    return (
      <details key={s.id} className="session-card">
        <summary>
          <span className="session-date">
            <strong>
              {formatDate(s.date, { weekday: "short" }).replace(".", "")}
            </strong>
            <small>{formatDate(s.date)}</small>
          </span>
          <span
            className="session-subject-icon"
            style={{ color: subject.color, background: `${subject.color}13` }}
          >
            <SubjectIcon name={subject.icon} size={23} />
          </span>
          <span className="session-title">
            <strong>{subject.name}</strong>
            <small>
              {s.startTime} – {s.endTime} <span>·</span>{" "}
              {minutes(s.endTime) - minutes(s.startTime)} min
            </small>
          </span>
          <span className="resource-tag">
            {resource?.name ?? "Estudo orientado"}
          </span>
          <ChevronDown size={17} />
        </summary>
        <div className="session-detail">
          <h4>Seu passo a passo</h4>
          {s.steps.map((step, i) => (
            <div className="recipe-step" key={i}>
              <span>{step.minutes} min</span>
              <p>{step.instruction}</p>
            </div>
          ))}
          {resource?.url && (
            <a
              className="text-link"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
            >
              Abrir {resource.name} <ArrowRight size={14} />
            </a>
          )}
          <div className="session-reasons">
            <Info size={16} />
            <div>
              <strong>Por que isso está aqui?</strong>
              {s.reasons.map((reason, i) => (
                <p key={i}>{reason}</p>
              ))}
            </div>
          </div>
          {debug && (
            <div className="debug-box">
              <strong>Pontuação do motor · {s.score}</strong>
              {s.breakdown.map((b) => (
                <div key={b.code}>
                  <code>{b.code}</code>
                  <span>
                    {b.value > 0 ? "+" : ""}
                    {b.value}
                  </span>
                </div>
              ))}
              <p>Receita: {s.recipeId}</p>
              {s.eventId && (
                <p>
                  Evento: {school.events.find((e) => e.id === s.eventId)?.title}
                </p>
              )}
            </div>
          )}
        </div>
      </details>
    );
  }
  return (
    <Shell schoolName={school.settings.schoolName}>
      <main className="student-main plan-main">
        <div className="page-intro plan-intro">
          <div>
            <div className="eyebrow">
              <Check size={14} /> TUDO PRONTO PARA COMEÇAR
            </div>
            <h1>
              Seu plano está pronto<span className="title-dot">!</span>
            </h1>
            <p>
              {plan.studentName ? `${plan.studentName}, seu` : "Seu"} próximo
              passo já tem um lugar na semana.
            </p>
          </div>
          <PlanCelebration />
          <button className="button secondary" onClick={pdf} disabled={busy}>
            <Download size={17} />
            {busy ? "Preparando PDF…" : "Baixar PDF"}
          </button>
        </div>
        <Progress step={3} />
        <div className="plan-banner">
          <div className="banner-icon">
            <CalendarDays size={26} />
          </div>
          <div>
            <h2>
              {year.name} <span>·</span> {cls.name}
            </h2>
            <p>
              {formatDate(plan.startDate)} —{" "}
              {formatDate(plan.endDate, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="plan-stat">
            <strong>{total.length}</strong>
            <span>sessões de estudo</span>
          </div>
          <div className="plan-stat">
            <strong>
              {Math.floor(duration / 60)}h{" "}
              {duration % 60 ? `${duration % 60}min` : ""}
            </strong>
            <span>no seu ritmo</span>
          </div>
          <Sparkles className="banner-spark" />
        </div>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        <div className="plan-layout">
          <section>
            <div className="section-title">
              <h2>
                <CalendarDays size={21} />
                {full
                  ? "Seu plano completo"
                  : weekIndex === 0
                    ? "Esta semana"
                    : `Semana ${weekIndex + 1}`}
              </h2>
              <button className="text-link" onClick={() => setFull(!full)}>
                {full ? "Ver uma semana" : "Ver plano completo"}
                <ArrowRight size={15} />
              </button>
            </div>
            {!full && (
              <div className="week-tabs">
                {plan.weeks.map((week, i) => (
                  <button
                    key={week.startDate}
                    className={weekIndex === i ? "active" : ""}
                    onClick={() => setWeek(i)}
                  >
                    Semana {i + 1}
                    <small>{formatDate(week.startDate)}</small>
                  </button>
                ))}
              </div>
            )}
            {(full ? plan.weeks : [plan.weeks[weekIndex]]).map((week, i) => (
              <div key={week.startDate} className="plan-week">
                {full && (
                  <h3 className="week-heading">
                    Semana {i + 1}
                    <span>
                      {formatDate(week.startDate)} — {formatDate(week.endDate)}
                    </span>
                  </h3>
                )}
                <div className="session-list">
                  {week.sessions.length ? (
                    week.sessions.map(sessionCard)
                  ) : (
                    <div className="empty-state">
                      <Clock3 size={30} />
                      <h3>Uma semana sem sessões</h3>
                      <p>
                        Não há horários suficientes dentro da disponibilidade e
                        da carga configuradas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="plan-footer-actions">
              <Link href="/student" className="button ghost">
                <ArrowLeft size={16} /> Criar outro plano
              </Link>
              <button className="button primary" onClick={pdf} disabled={busy}>
                <Download size={17} /> Baixar meu plano
              </button>
            </div>
          </section>
          <aside>
            <div className="events-card">
              <h3>
                <Flag size={18} /> No seu radar
              </h3>
              <p className="muted small">Próximos pontos importantes</p>
              {events.length ? (
                events.map((e) => (
                  <div key={e.id} className="event-item">
                    <div className="event-date">
                      <strong>
                        {formatDate(e.startDate, { day: "2-digit" })}
                      </strong>
                      <span>
                        {formatDate(e.startDate, { month: "short" }).replace(
                          ".",
                          "",
                        )}
                      </span>
                    </div>
                    <div>
                      <strong>{e.title}</strong>
                      <small>
                        {
                          school.eventTypes.find((t) => t.id === e.eventTypeId)
                            ?.name
                        }
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted small">
                  Nenhum evento cadastrado para este período.
                </p>
              )}
            </div>
            <div className="plan-tip">
              <span>✦</span>
              <h3>
                Consistência vale mais
                <br />
                que pressa.
              </h3>
              <p>
                Comece com o que está no plano de hoje. Amanhã, você dá mais um
                passo.
              </p>
            </div>
          </aside>
        </div>
        {plan.warnings.length > 0 && (
          <details className="warnings">
            <summary>
              <Info size={18} /> {plan.warnings.length} observação(ões) sobre
              seu plano <ChevronDown size={16} />
            </summary>
            <ul>
              {plan.warnings.map((w, i) => (
                <li key={i}>
                  {w.week && <strong>Semana de {formatDate(w.week)}: </strong>}
                  {w.message}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="snapshot-note">
          <List size={14} /> Plano salvo com as regras e os materiais da data de
          elaboração. Abra uma sessão para ver as atividades.
        </p>
      </main>
    </Shell>
  );
}
