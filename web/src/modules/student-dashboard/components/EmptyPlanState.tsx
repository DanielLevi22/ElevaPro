"use client";

import Link from "next/link";

interface Props {
  type: "workout" | "nutrition";
  /** Only members can create plans. Students see a passive message. */
  isMember: boolean;
}

const LABELS = {
  workout: {
    icon: "🏋️",
    title: "Nenhum treino atribuído",
    studentMessage: "Seu personal trainer ainda não criou um plano de treino para você.",
    aiHref: "/dashboard/student/coach",
    manualHref: "/dashboard/student/workouts/new",
  },
  nutrition: {
    icon: "🥗",
    title: "Nenhum plano alimentar",
    studentMessage: "Seu personal trainer ainda não criou um plano alimentar para você.",
    aiHref: "/dashboard/student/coach",
    manualHref: "/dashboard/student/nutrition/new",
  },
};

export function EmptyPlanState({ type, isMember }: Props) {
  const cfg = LABELS[type];

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <span className="text-5xl">{cfg.icon}</span>
      <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{cfg.title}</h3>

      {isMember ? (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href={cfg.aiHref}
            className="px-6 py-3 bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-colors"
          >
            Criar com IA
          </Link>
          <Link
            href={cfg.manualHref}
            className="px-6 py-3 bg-surface-highlight border border-overlay-10 text-foreground font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-surface-highlight transition-colors"
          >
            Criar você mesmo
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground max-w-xs">{cfg.studentMessage}</p>
      )}
    </div>
  );
}
