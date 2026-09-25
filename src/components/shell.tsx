"use client";
import Link from "next/link";
import Image from "next/image";
import { useDialogFocus } from "./use-dialog-focus";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Heart,
  ShieldCheck,
  X,
} from "lucide-react";
export function Brand({
  name,
  variant = "color",
}: {
  name: string;
  variant?: "color" | "white";
}) {
  const white = variant === "white";
  return (
    <Link href="/student" className="brand" aria-label={`${name} — início`}>
      <Image
        src={
          white
            ? "/logo-lourenco-castanho-branco.png"
            : "/logo-lourenco-castanho.jpg"
        }
        alt={name}
        width={white ? 700 : 664}
        height={white ? 158 : 226}
        className="brand-logo"
        preload
      />
    </Link>
  );
}
export function Shell({
  schoolName,
  children,
}: {
  schoolName: string;
  children: React.ReactNode;
}) {
  const [help, setHelp] = useState(false);
  useDialogFocus(help, () => setHelp(false));
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Brand name={schoolName} variant="white" />
          <nav aria-label="Menu principal">
            <Link href="/student" className="nav-active">
              Plano de estudos
            </Link>
            <button onClick={() => setHelp(true)}>
              Como funciona <ArrowUpRight size={14} />
            </button>
          </nav>
          <Link className="admin-link" href="/admin">
            <ShieldCheck size={16} /> Área da escola <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <span>
          <BookOpen size={16} /> Um pouco a cada dia. Muito mais para o seu
          futuro.
        </span>
        <span>
          Feito para o seu jeito de aprender <Heart size={13} />
        </span>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-button modal-close"
              aria-label="Fechar"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">SEU ESTUDO, MAIS LEVE</div>
            <h2 id="help-title">Três escolhas. Um plano seu.</h2>
            <p>
              Conte sua turma, suas prioridades e quando você pode estudar.
              Organizamos as atividades com base nas aulas e no calendário da
              escola.
            </p>
            <ul className="help-list">
              <li>
                <Check /> Respeita o tempo que você tem.
              </li>
              <li>
                <Check /> Prepara você para as próximas avaliações.
              </li>
              <li>
                <Check /> Deixa espaço para descansar.
              </li>
            </ul>
            <p className="muted small">
              O plano usa regras pedagógicas configuradas pela escola, sem
              inteligência artificial. Os dados iniciais são exemplos para
              demonstração.
            </p>
            <button className="button primary" onClick={() => setHelp(false)}>
              Vamos começar
            </button>
          </section>
        </div>
      )}
    </>
  );
}
export function Progress({ step }: { step: number }) {
  return (
    <ol className="progress" aria-label="Etapas do plano">
      {["Dados", "Matérias", "Horários", "Plano"].map((name, index) => (
        <li
          key={name}
          className={
            index === step ? "current" : index < step ? "completed" : ""
          }
          aria-current={index === step ? "step" : undefined}
        >
          <span className="step-circle">
            {index < step ? <Check size={16} /> : index + 1}
          </span>
          <span>{name}</span>
          {index < 3 && <i />}
        </li>
      ))}
    </ol>
  );
}
