"use client";

import type { Periodization } from "@elevapro/shared";
import Link from "next/link";
import { formatDateRange } from "@/shared/utils/formatDate";

interface PeriodizationsTableProps {
  periodizations: Periodization[];
  /** O aluno ve os proprios ciclos, entao a coluna de nome do aluno nao faz sentido. */
  isMember: boolean;
}

const OBJECTIVE_LABEL: Record<string, string> = {
  hypertrophy: "Hipertrofia",
  strength: "Força",
  endurance: "Resistência",
  weight_loss: "Emagrecimento",
  conditioning: "Condicionamento",
  general_fitness: "Saúde Geral",
};

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-secondary/10 text-secondary border-secondary/20",
  active: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planejada",
  active: "Ativa",
  completed: "Concluída",
};

function phaseCount(count: number | null | undefined): string {
  const total = count ?? 0;
  return `${total} ${total === 1 ? "fase" : "fases"}`;
}

export function PeriodizationsTable({ periodizations, isMember }: PeriodizationsTableProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 border-b border-border text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="flex-1">Nome</span>
        <span className="w-28">Objetivo</span>
        <span className="w-36">Período</span>
        <span className="w-20">Fases</span>
        <span className="w-24">Status</span>
      </div>

      <ul>
        {periodizations.map((p) => (
          <li key={p.id} className="border-b border-border last:border-b-0">
            <Link
              href={`/dashboard/workouts/periodizations/${p.id}`}
              className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3 px-4 py-3 transition-colors hover:bg-overlay-05 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-bold text-foreground truncate">
                  {p.name}
                </span>
                {!isMember && p.student && (
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {p.student.full_name}
                  </span>
                )}
              </span>

              <span className="lg:w-28 text-[11.5px] text-muted-foreground truncate">
                {OBJECTIVE_LABEL[p.objective ?? ""] ?? p.objective ?? "—"}
              </span>
              <span className="lg:w-36 text-[11.5px] text-muted-foreground">
                {formatDateRange(p.start_date, p.end_date)}
              </span>
              <span className="lg:w-20 text-[11.5px] text-muted-foreground">
                {phaseCount(p.training_plans_count)}
              </span>

              <span className="lg:w-24">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[p.status] ?? STATUS_STYLE.planned}`}
                >
                  {STATUS_LABEL[p.status] ?? STATUS_LABEL.planned}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
