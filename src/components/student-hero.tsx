import Image from "next/image";
import { CalendarDays, Sparkles } from "lucide-react";

const titles = [
  <>
    Plano de <span>Estudos.</span>
  </>,
  <>
    Onde você precisa de <span>mais ajuda?</span>
  </>,
  <>
    Quando você pode <span>estudar?</span>
  </>,
];
const subtitles = [
  "Vamos montar um plano personalizado para você. Um passo de cada vez, no seu ritmo.",
  "Escolha suas matérias e conte o que merece mais atenção. O plano começa pelas suas prioridades.",
  "Encontre um espaço na sua rotina. A gente organiza os estudos e deixa tempo para você descansar.",
];

export function StudentHero({
  step,
  academicYear,
  simulator,
}: {
  step: number;
  academicYear: number;
  simulator: boolean;
}) {
  return (
    <header className={`student-hero hero-step-${step}`}>
      <div className="hero-copy">
        <div className="hero-greeting">
          <span className="greeting-spark">
            <Sparkles size={16} />
          </span>
          {simulator ? "Vamos simular um plano?" : "Olá, estudante!"}
        </div>
        <h1>{titles[step]}</h1>
        <p>{subtitles[step]}</p>
        <div className="hero-school-year">
          <CalendarDays size={15} />
          <span>{academicYear}</span>
          <i />
          <span>Ensino Fundamental</span>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="hero-orbit" />
        <span className="hero-sun" />
        <span className="hero-dot" />
        <Image
          src="/illustrations/student-hero.png"
          alt=""
          width={1280}
          height={1280}
          className="hero-student"
          sizes="(max-width: 600px) 150px, 330px"
          preload
        />
        <div className="hero-sticker">
          <span>✓</span> Você consegue!
        </div>
      </div>
    </header>
  );
}

export function PlanCelebration() {
  return (
    <div className="plan-celebration" aria-hidden="true">
      <span className="celebration-circle" />
      <svg viewBox="0 0 200 140" fill="none">
        <path d="M31 103 107 127 176 99 102 76Z" fill="#47209C" />
        <path d="m31 90 76 24 69-28v13l-69 28-76-24Z" fill="#6E3BDB" />
        <path d="m42 94 65 20 58-23v9l-58 22-65-20Z" fill="#F6EEFF" />
        <path d="m27 72 76 24 70-28-77-22Z" fill="#FFCA43" />
        <path d="m27 72 76 24 70-28v12l-70 28-76-24Z" fill="#DCA62D" />
        <path d="m37 79 66 20 59-23v8l-59 23-66-21Z" fill="#FFFBEE" />
        <path d="m40 48 76 24 64-28-75-24Z" fill="#8D5FF0" />
        <path d="m40 48 76 24 64-28v13l-64 29-76-25Z" fill="#6030C6" />
        <path d="m50 54 66 21 55-24v9l-55 24-66-21Z" fill="#EDE3FF" />
        <path
          d="M18 39 9 30M39 19l-4-12m130 20 9-11M181 69l12 1"
          stroke="#FFC83D"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="m142 11 4-8M19 116l-7 7"
          stroke="#9866F0"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
