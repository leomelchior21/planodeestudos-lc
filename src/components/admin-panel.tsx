"use client";
import { useState } from "react";
import { useDialogFocus } from "./use-dialog-focus";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { SchoolData } from "@/domain/types";
import { parseSchoolData } from "@/domain/school-validation";
import { addDays, dayNames, formatDate, today, weekday } from "@/domain/dates";
import { Brand } from "./shell";
import { StudentWizard } from "./student-wizard";
import {
  defaultRow,
  fieldNames,
  names,
  references,
  type Collection,
  type Row,
} from "./admin-fields";
import {
  downloadText,
  exportSchoolData,
  importTemplates,
  prepareImport,
  readImportFile,
  type ImportKind,
} from "@/services/import-export";

const sections = [
  ["overview", "Visão geral", LayoutDashboard],
  ["years", "Anos e turmas", GraduationCap],
  ["subjects", "Disciplinas", BookOpen],
  ["schedule", "Grade horária", Table2],
  ["calendar", "Calendário", CalendarDays],
  ["resources", "Materiais", BookOpen],
  ["activities", "Atividades", ClipboardList],
  ["rules", "Regras", Settings2],
  ["import", "Importar dados", Upload],
  ["simulate", "Simular plano", FlaskConical],
] as const;
export function AdminLogin() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main className="login-page">
      <form
        className="wizard-card login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha ao entrar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="section-icon">
          <ShieldCheck />
        </span>
        <h1>Área da escola</h1>
        <p className="muted">Acesso para orientação e coordenação.</p>
        <label>
          Senha administrativa
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="alert error">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <Link className="text-link" href="/student">
          <ArrowLeft size={15} /> Voltar para o aluno
        </Link>
      </form>
    </main>
  );
}

export function AdminPanel({
  initial,
  storageMode,
}: {
  initial: SchoolData;
  storageMode: string;
}) {
  const [data, setData] = useState(initial),
    [section, setSection] = useState("overview"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<{
    collection: Collection | "settings";
    row: Row;
    isNew: boolean;
  } | null>(null);
  const [classId, setClassId] = useState(initial.classes[0]?.id ?? "");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [calendarView, setCalendarView] = useState("list");
  const [kind, setKind] = useState<ImportKind>("events"),
    [preview, setPreview] = useState<SchoolData | null>(null),
    [previewFile, setPreviewFile] = useState("");
  const [filter, setFilter] = useState("");
  const router = useRouter();
  function update(next: SchoolData) {
    setData(next);
    setDirty(true);
    setMessage("");
    setError("");
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      parseSchoolData(data);
      const r = await fetch("/api/school", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setDirty(false);
      setMessage("Alterações salvas. Os próximos planos usarão estes dados.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  function remove(collection: Collection, id: string) {
    try {
      const next = {
        ...data,
        [collection]: data[collection].filter((row) => row.id !== id),
      };
      parseSchoolData(next);
      update(next);
    } catch {
      setError(
        "Este registro ainda é usado por outros dados. Desative-o ou remova seus vínculos antes de excluir.",
      );
    }
  }
  function commit(row: Row) {
    if (!editing) return;
    try {
      const next =
        editing.collection === "settings"
          ? { ...data, settings: row }
          : {
              ...data,
              [editing.collection]: editing.isNew
                ? [...data[editing.collection], row]
                : data[editing.collection].map((r) =>
                    r.id === row.id ? row : r,
                  ),
            };
      update(parseSchoolData(next));
      setEditing(null);
    } catch (e) {
      throw e;
    }
  }
  function reorder(collection: Collection, index: number, delta: number) {
    const rows = [...data[collection]] as Row[];
    [rows[index], rows[index + delta]] = [rows[index + delta], rows[index]];
    update({ ...data, [collection]: rows.map((r, i) => ({ ...r, order: i })) });
  }
  function collection(key: Collection, description?: string) {
    const rows = data[key] as Row[];
    const visible = rows.filter(
      (r) =>
        !filter ||
        JSON.stringify(r)
          .toLocaleLowerCase()
          .includes(filter.toLocaleLowerCase()),
    );
    return (
      <section className="admin-card" key={key}>
        <div className="section-title">
          <div>
            <h2>
              {names[key]} <span className="count">{rows.length}</span>
            </h2>
            {description && <p className="muted small">{description}</p>}
          </div>
          <button
            className="button secondary small-button"
            onClick={() =>
              setEditing({
                collection: key,
                row: defaultRow(key, data),
                isNew: true,
              })
            }
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome / referência</th>
                <th>Detalhes</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const main = String(
                  row.name ??
                    row.title ??
                    row.code ??
                    row.text ??
                    data.subjects.find((s) => s.id === row.subjectId)?.name ??
                    row.id,
                );
                const details = row.classId
                  ? data.classes.find((c) => c.id === row.classId)?.code
                  : row.subjectId
                    ? data.subjects.find((s) => s.id === row.subjectId)?.name
                    : (row.description ??
                      row.instruction ??
                      row.code ??
                      row.eventTypeId ??
                      "");
                return (
                  <tr key={String(row.id)}>
                    <td>
                      <strong>{main}</strong>
                      {row.startDate ? (
                        <small>{formatDate(String(row.startDate))}</small>
                      ) : null}
                    </td>
                    <td>
                      {String(details)}
                      {!!row.resourceId && (
                        <small>
                          {
                            data.resources.find((r) => r.id === row.resourceId)
                              ?.name
                          }
                        </small>
                      )}
                      {typeof row.value === "number" && (
                        <b className="rule-value">{row.value}</b>
                      )}
                    </td>
                    <td>
                      {"active" in row ? (
                        <button
                          className={`status-pill ${row.active ? "on" : ""}`}
                          onClick={() =>
                            update({
                              ...data,
                              [key]: rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, active: !r.active }
                                  : r,
                              ),
                            })
                          }
                        >
                          {row.active ? "Ativo" : "Inativo"}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {"order" in row && (
                          <>
                            <button
                              aria-label={`Subir ${main}`}
                              className="icon-button"
                              disabled={rows.indexOf(row) === 0}
                              onClick={() =>
                                reorder(key, rows.indexOf(row), -1)
                              }
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              aria-label={`Descer ${main}`}
                              className="icon-button"
                              disabled={rows.indexOf(row) === rows.length - 1}
                              onClick={() => reorder(key, rows.indexOf(row), 1)}
                            >
                              <ArrowDown size={14} />
                            </button>
                          </>
                        )}
                        <button
                          className="icon-button"
                          aria-label={`Editar ${main}`}
                          onClick={() =>
                            setEditing({
                              collection: key,
                              row: structuredClone(row),
                              isNew: false,
                            })
                          }
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`Excluir ${main}`}
                          onClick={() => remove(key, String(row.id))}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && (
            <p className="empty-state">Nenhum registro encontrado.</p>
          )}
        </div>
      </section>
    );
  }
  async function upload(file: File) {
    setError("");
    setPreview(null);
    try {
      const input = await readImportFile(file);
      setPreview(prepareImport(data, kind, input));
      setPreviewFile(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arquivo inválido");
    }
  }
  function changeSchedule(day: number, period: number, subjectId: string) {
    const next = structuredClone(data);
    const existing = next.schedules.find(
      (s) =>
        s.classId === classId && s.weekday === day && s.periodNumber === period,
    );
    if (!subjectId) {
      next.schedules = next.schedules.filter((s) => s !== existing);
    } else if (existing) existing.subjectId = subjectId;
    else {
      const samePeriod = next.schedules.find(
        (s) => s.classId === classId && s.periodNumber === period,
      );
      next.schedules.push({
        id: crypto.randomUUID(),
        classId,
        weekday: day,
        periodNumber: period,
        startTime: samePeriod?.startTime ?? "07:30",
        endTime: samePeriod?.endTime ?? "08:20",
        subjectId,
      });
    }
    update(next);
  }
  const monthEvents = data.events
    .filter((e) => e.startDate <= `${month}-31` && e.endDate >= `${month}-01`)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const first = `${month}-01`;
  const monthStart = addDays(first, -((weekday(first) + 6) % 7));
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand name={data.settings.schoolName} />
        <div className="admin-label">GESTÃO PEDAGÓGICA</div>
        <nav aria-label="Administração">
          {sections.map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => {
                setSection(id);
                setFilter("");
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="storage-indicator">
            <i />
            {storageMode === "local"
              ? "Armazenamento local"
              : "Supabase conectado"}
          </span>
          <Link href="/student">
            <ArrowLeft size={15} /> Área do aluno
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/admin/login", { method: "DELETE" });
              router.refresh();
            }}
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <span>
            <ShieldCheck size={16} /> Área da escola
          </span>
          <div>
            {dirty && <span className="unsaved">Alterações não salvas</span>}
            <button
              className="button primary small-button"
              disabled={!dirty || busy}
              onClick={save}
            >
              <Save size={15} />
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <div className="eyebrow">CONFIGURAÇÃO DA ESCOLA</div>
              <h1>{sections.find((s) => s[0] === section)?.[1]}</h1>
              <p className="muted">
                Dados organizados. Planos que acompanham a escola.
              </p>
            </div>
            {!["overview", "import", "simulate", "schedule"].includes(
              section,
            ) && (
              <input
                className="search-input"
                aria-label="Buscar registros"
                placeholder="Buscar registros…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            )}
          </div>
          {message && (
            <p role="status" className="alert success">
              <Check size={16} />
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="alert error">
              {error}
            </p>
          )}
          {section === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  [
                    data.schoolYears.filter((x) => x.active).length,
                    "anos escolares",
                  ],
                  [
                    data.classes.filter((x) => x.active).length,
                    "turmas ativas",
                  ],
                  [data.subjects.filter((x) => x.active).length, "disciplinas"],
                  [data.events.length, "eventos no calendário"],
                ].map(([value, label]) => (
                  <div className="stat-card" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <section className="admin-welcome">
                <span className="section-icon">
                  <GraduationCap />
                </span>
                <h2>Um bom plano começa com bons dados.</h2>
                <p>
                  Atualize a grade, cadastre as avaliações e ajuste as
                  recomendações da escola. O motor usa essas informações para
                  organizar cada plano.
                </p>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => setSection("simulate")}
                  >
                    Simular um plano <ChevronRight size={17} />
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setSection("import")}
                  >
                    <Upload size={17} /> Importar calendário
                  </button>
                </div>
              </section>
              <div className="admin-card">
                <div className="section-title">
                  <h2>Configurações da escola</h2>
                  <button
                    className="button secondary small-button"
                    onClick={() =>
                      setEditing({
                        collection: "settings",
                        row: { ...data.settings },
                        isNew: false,
                      })
                    }
                  >
                    <Pencil size={15} /> Editar
                  </button>
                </div>
                <div className="settings-summary">
                  {[
                    ["Escola", data.settings.schoolName],
                    ["Ano letivo", data.settings.academicYear],
                    [
                      "Duração do plano",
                      `${data.settings.planDefaultWeeks} semanas`,
                    ],
                    [
                      "Carga disponível utilizada",
                      `${data.settings.targetStudyLoadPercentage * 100}%`,
                    ],
                    [
                      "Sessão mínima",
                      `${data.settings.minimumStudyMinutes} minutos`,
                    ],
                    [
                      "Limite diário",
                      `${data.settings.maxStudyMinutesPerDay} minutos`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <p className="alert">
                Os dados iniciais são fictícios. Importe e valide o calendário
                oficial antes de disponibilizar os planos aos alunos.
              </p>
            </>
          )}
          {section === "years" && (
            <>
              {collection("schoolYears")}
              {collection("classes")}
            </>
          )}
          {section === "subjects" && (
            <>
              {collection("subjects")}
              {collection(
                "classSubjects",
                "Defina quais disciplinas aparecem para cada turma.",
              )}
            </>
          )}
          {section === "schedule" && (
            <>
              <section className="admin-card">
                <div className="section-title">
                  <h2>Grade semanal</h2>
                  <select
                    aria-label="Turma da grade"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-table-scroll">
                  <table className="timetable">
                    <thead>
                      <tr>
                        <th>Aula</th>
                        {data.settings.weekdays.map((d) => (
                          <th key={d}>{dayNames[d]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        {
                          length: Math.max(
                            5,
                            ...data.schedules
                              .filter((s) => s.classId === classId)
                              .map((s) => s.periodNumber),
                          ),
                        },
                        (_, i) => i + 1,
                      ).map((period) => (
                        <tr key={period}>
                          <td>
                            <strong>{period}ª</strong>
                            <small>
                              {
                                data.schedules.find(
                                  (s) =>
                                    s.classId === classId &&
                                    s.periodNumber === period,
                                )?.startTime
                              }
                            </small>
                          </td>
                          {data.settings.weekdays.map((day) => (
                            <td key={day}>
                              <select
                                aria-label={`${dayNames[day]} aula ${period}`}
                                value={
                                  data.schedules.find(
                                    (s) =>
                                      s.classId === classId &&
                                      s.weekday === day &&
                                      s.periodNumber === period,
                                  )?.subjectId ?? ""
                                }
                                onChange={(e) =>
                                  changeSchedule(day, period, e.target.value)
                                }
                              >
                                <option value="">Livre</option>
                                {data.subjects
                                  .filter(
                                    (s) =>
                                      s.active &&
                                      data.classSubjects.some(
                                        (c) =>
                                          c.classId === classId &&
                                          c.subjectId === s.id,
                                      ),
                                  )
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.code}
                                    </option>
                                  ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted small">
                  Edite as células para trocar disciplinas. Em “Aulas”, edite os
                  horários ou adicione períodos.
                </p>
              </section>
              {collection("schedules")}
            </>
          )}
          {section === "calendar" && (
            <>
              <section className="admin-card">
                <div className="section-title">
                  <div className="button-row">
                    <button
                      className="icon-button"
                      aria-label="Mês anterior"
                      onClick={() =>
                        setMonth(addDays(`${month}-01`, -1).slice(0, 7))
                      }
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <input
                      aria-label="Mês do calendário"
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    />
                    <button
                      className="icon-button"
                      aria-label="Próximo mês"
                      onClick={() =>
                        setMonth(addDays(`${month}-28`, 5).slice(0, 7))
                      }
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="segmented">
                    <button
                      className={calendarView === "list" ? "active" : ""}
                      onClick={() => setCalendarView("list")}
                    >
                      Lista
                    </button>
                    <button
                      className={calendarView === "month" ? "active" : ""}
                      onClick={() => setCalendarView("month")}
                    >
                      Mês
                    </button>
                  </div>
                  <button
                    className="button primary small-button"
                    onClick={() =>
                      setEditing({
                        collection: "events",
                        row: defaultRow("events", data),
                        isNew: true,
                      })
                    }
                  >
                    <Plus size={15} /> Novo evento
                  </button>
                </div>
                {calendarView === "month" ? (
                  <div className="month-grid">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <b key={d}>{dayNames[d]}</b>
                    ))}
                    {Array.from({ length: 42 }, (_, i) =>
                      addDays(monthStart, i),
                    ).map((date) => (
                      <div
                        key={date}
                        className={date.slice(0, 7) !== month ? "outside" : ""}
                      >
                        <span>{Number(date.slice(-2))}</span>
                        {monthEvents
                          .filter(
                            (e) => e.startDate <= date && e.endDate >= date,
                          )
                          .map((e) => (
                            <button
                              key={e.id}
                              onClick={() =>
                                setEditing({
                                  collection: "events",
                                  row: { ...e },
                                  isNew: false,
                                })
                              }
                            >
                              {e.title}
                            </button>
                          ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {monthEvents.length ? (
                      monthEvents.map((e) => (
                        <div className="calendar-row" key={e.id}>
                          <div className="event-date">
                            <strong>
                              {formatDate(e.startDate, { day: "2-digit" })}
                            </strong>
                            <span>
                              {formatDate(e.startDate, { month: "short" })}
                            </span>
                          </div>
                          <div>
                            <strong>{e.title}</strong>
                            <p className="muted small">
                              {
                                data.eventTypes.find(
                                  (t) => t.id === e.eventTypeId,
                                )?.name
                              }{" "}
                              ·{" "}
                              {e.classId
                                ? data.classes.find((c) => c.id === e.classId)
                                    ?.code
                                : e.schoolYearId
                                  ? data.schoolYears.find(
                                      (y) => y.id === e.schoolYearId,
                                    )?.name
                                  : "Toda a escola"}
                              {e.metadata.sample ? " · Exemplo" : ""}
                            </p>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`Editar ${e.title}`}
                            onClick={() =>
                              setEditing({
                                collection: "events",
                                row: { ...e },
                                isNew: false,
                              })
                            }
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Excluir ${e.title}`}
                            onClick={() => remove("events", e.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">Nenhum evento neste mês.</p>
                    )}
                  </div>
                )}
              </section>
              {collection(
                "eventTypes",
                "Os tipos definem peso, antecedência e bloqueio de estudo.",
              )}
            </>
          )}
          {section === "resources" && (
            <>
              {collection(
                "resources",
                "Mínimos semanais são configurados por material, sem nomes fixos no motor.",
              )}
              {collection("subjectResources")}
            </>
          )}
          {section === "activities" && (
            <>
              {collection(
                "recipes",
                "As etapas referenciam os identificadores das atividades. A soma das durações deve corresponder à receita.",
              )}
              {collection("activities")}
            </>
          )}
          {section === "rules" && (
            <>
              <div className="admin-card">
                <div className="section-title">
                  <div>
                    <h2>Duração e carga de estudo</h2>
                    <p className="muted small">
                      Sessão mínima, limite diário, dias e percentual da
                      disponibilidade.
                    </p>
                  </div>
                  <button
                    className="button secondary small-button"
                    onClick={() =>
                      setEditing({
                        collection: "settings",
                        row: { ...data.settings },
                        isNew: false,
                      })
                    }
                  >
                    Editar configurações
                  </button>
                </div>
              </div>
              {collection(
                "rules",
                "Os códigos identificam os critérios reconhecidos pelo motor. Altere os valores ou desative os critérios existentes.",
              )}
              {collection("phases")}
              {collection("reasonTemplates")}
            </>
          )}
          {section === "import" && (
            <>
              <section className="admin-card">
                <h2>Importar dados estruturados</h2>
                <p className="muted">
                  Use CSV, XLSX ou JSON. Confira a prévia antes de aplicar e
                  salvar.
                </p>
                <div className="form-grid">
                  <label>
                    O que deseja importar?
                    <select
                      value={kind}
                      onChange={(e) => {
                        setKind(e.target.value as ImportKind);
                        setPreview(null);
                      }}
                    >
                      <option value="events">Calendário acadêmico</option>
                      <option value="schedules">Grade horária</option>
                      <option value="resources">
                        Materiais por disciplina
                      </option>
                      <option value="backup">Backup completo (JSON)</option>
                    </select>
                  </label>
                </div>
                <div className="import-dropzone">
                  <Upload size={30} />
                  <h3>Escolha o arquivo da escola</h3>
                  <p>CSV, XLSX ou JSON · até 5 MB</p>
                  <input
                    aria-label="Arquivo para importar"
                    type="file"
                    accept={kind === "backup" ? ".json" : ".csv,.xlsx,.json"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                {kind !== "backup" && (
                  <button
                    className="text-link"
                    onClick={() =>
                      downloadText(
                        `modelo-${kind}.csv`,
                        importTemplates[kind],
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={16} /> Baixar modelo CSV
                  </button>
                )}
                {preview && (
                  <div className="import-preview">
                    <h3>Prévia: {previewFile}</h3>
                    <p>
                      {kind === "backup"
                        ? "Este backup substituirá toda a configuração ao salvar."
                        : "Registros compatíveis serão atualizados; novos registros serão adicionados."}
                    </p>
                    <div className="stats-grid">
                      <div>
                        <strong>{preview.events.length}</strong>
                        <span>eventos no resultado</span>
                      </div>
                      <div>
                        <strong>{preview.schedules.length}</strong>
                        <span>aulas no resultado</span>
                      </div>
                      <div>
                        <strong>{preview.resources.length}</strong>
                        <span>materiais no resultado</span>
                      </div>
                    </div>
                    <pre>
                      {JSON.stringify(
                        kind === "events"
                          ? preview.events.filter(
                              (x) =>
                                JSON.stringify(x) !==
                                JSON.stringify(
                                  data.events.find((d) => d.id === x.id),
                                ),
                            )
                          : kind === "schedules"
                            ? preview.schedules.filter(
                                (x) =>
                                  JSON.stringify(x) !==
                                  JSON.stringify(
                                    data.schedules.find((d) => d.id === x.id),
                                  ),
                              )
                            : kind === "resources"
                              ? preview.resources
                              : preview.settings,
                        null,
                        2,
                      )}
                    </pre>
                    <button
                      className="button primary"
                      onClick={() => {
                        update(preview);
                        setPreview(null);
                        setMessage(
                          "Prévia aplicada. Clique em Salvar alterações para concluir a importação.",
                        );
                      }}
                    >
                      <Check size={16} /> Aplicar importação
                    </button>
                  </div>
                )}
              </section>
              <section className="admin-card">
                <h2>Backup e portabilidade</h2>
                <p className="muted">
                  Exporte anos, turmas, calendário, materiais, atividades e
                  regras em um único arquivo.
                </p>
                <button
                  className="button secondary"
                  onClick={() => exportSchoolData(data)}
                >
                  <Download size={17} /> Exportar school-data.json
                </button>
              </section>
            </>
          )}
          {section === "simulate" &&
            (dirty ? (
              <div className="admin-card">
                <h2>Salve as alterações para simular</h2>
                <p>
                  O simulador usa os dados salvos da escola para reproduzir a
                  experiência do aluno.
                </p>
                <button className="button primary" onClick={save}>
                  Salvar e preparar simulação
                </button>
              </div>
            ) : (
              <StudentWizard school={data} simulator />
            ))}
        </main>
      </div>
      {editing && (
        <RecordEditor
          value={editing.row}
          title={
            editing.collection === "settings"
              ? "Configurações da escola"
              : `${editing.isNew ? "Adicionar" : "Editar"} · ${names[editing.collection]}`
          }
          data={data}
          onClose={() => setEditing(null)}
          onSave={commit}
        />
      )}
    </div>
  );
}

function RecordEditor({
  value,
  title,
  data,
  onClose,
  onSave,
}: {
  value: Row;
  title: string;
  data: SchoolData;
  onClose: () => void;
  onSave: (row: Row) => void;
}) {
  useDialogFocus(true, onClose);
  const [row, setRow] = useState<Row>(value),
    [json, setJson] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => typeof v === "object" && v !== null)
          .map(([k, v]) => [k, JSON.stringify(v, null, 2)]),
      ),
    ),
    [error, setError] = useState("");
  return (
    <div className="modal-backdrop">
      <form
        className="modal record-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-title"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const next = { ...row };
            for (const [key, text] of Object.entries(json))
              next[key] = JSON.parse(text);
            onSave(next);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Dados inválidos");
          }
        }}
      >
        <div className="section-title">
          <h2 id="record-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fechar editor"
          >
            <X size={20} />
          </button>
        </div>
        <div className="record-fields">
          {Object.entries(row).map(([key, val]) =>
            key === "id" ? (
              <label key={key} className="full-field">
                Identificador
                <input value={String(val)} readOnly className="readonly" />
              </label>
            ) : (
              <label
                key={key}
                className={
                  (typeof val === "object" && val !== null) ||
                  ["instruction", "description", "text"].includes(key)
                    ? "full-field"
                    : ""
                }
              >
                {fieldNames[key] ?? key}
                {references[key] ? (
                  <select
                    value={String(val ?? "")}
                    onChange={(e) =>
                      setRow({ ...row, [key]: e.target.value || null })
                    }
                  >
                    <option value="">Todos / não definido</option>
                    {(data[references[key]] as Row[]).map((r) => (
                      <option key={String(r.id)} value={String(r.id)}>
                        {String(r.name ?? r.code ?? r.id)}
                        {r.code && r.name ? ` (${r.code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : typeof val === "boolean" ? (
                  <span className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) =>
                        setRow({ ...row, [key]: e.target.checked })
                      }
                    />
                    {val ? "Sim" : "Não"}
                  </span>
                ) : typeof val === "object" && val !== null ? (
                  <textarea
                    className="json-input"
                    rows={key === "steps" ? 10 : 4}
                    value={json[key] ?? ""}
                    onChange={(e) =>
                      setJson({ ...json, [key]: e.target.value })
                    }
                  />
                ) : ["instruction", "description", "text"].includes(key) ? (
                  <textarea
                    rows={3}
                    value={String(val ?? "")}
                    onChange={(e) => setRow({ ...row, [key]: e.target.value })}
                  />
                ) : (
                  <input
                    type={
                      typeof val === "number"
                        ? "number"
                        : key.toLowerCase().includes("date")
                          ? "date"
                          : key.toLowerCase().includes("time")
                            ? "time"
                            : key === "color"
                              ? "color"
                              : "text"
                    }
                    step={typeof val === "number" ? "any" : undefined}
                    value={String(val ?? "")}
                    onChange={(e) =>
                      setRow({
                        ...row,
                        [key]:
                          typeof val === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </label>
            ),
          )}
        </div>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary">
            <Check size={17} /> Aplicar alteração
          </button>
        </div>
      </form>
    </div>
  );
}
