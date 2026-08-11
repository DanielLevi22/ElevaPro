import Link from "next/link";
import type { ReactNode } from "react";

type ActionTone = "primary" | "secondary" | "accent";

interface QuickAction {
  title: string;
  icon: ReactNode;
  href: string;
  tone: ActionTone;
}

// primary usa --primary-text: o lime puro como rotulo sobre fundo claro nao
// alcanca contraste AA.
const TONE: Record<ActionTone, string> = {
  primary: "bg-primary/6 border-primary/25 text-primary-text",
  secondary: "bg-secondary/6 border-secondary/25 text-secondary",
  accent: "bg-accent/6 border-accent/25 text-accent",
};

// "Relatorios" existe no design mas nao no produto: nao ha rota de relatorios,
// e a acao antiga apontava para /dashboard, a propria pagina.
const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Adicionar Aluno",
    href: "/dashboard/students",
    tone: "primary",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      </svg>
    ),
  },
  {
    title: "Criar Treino",
    href: "/dashboard/workouts",
    tone: "secondary",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    title: "Criar Dieta",
    href: "/dashboard/diets/new",
    tone: "accent",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className={`flex-1 min-w-45 flex items-center gap-2.5 rounded-full border px-4 py-2.5 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${TONE[action.tone]}`}
        >
          {action.icon}
          <span className="text-[12.5px] font-bold whitespace-nowrap">{action.title}</span>
        </Link>
      ))}
    </div>
  );
}
