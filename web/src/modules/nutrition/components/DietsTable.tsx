"use client";

import type { DietPlan } from "@elevapro/shared";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";

/** O service anexa o perfil do aluno ao plano — ver nutrition.service.fetchDietPlans. */
export type DietPlanWithStudent = DietPlan & {
  student?: { id: string; full_name: string };
};

interface DietsTableProps {
  dietPlans: DietPlanWithStudent[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_STYLE: Record<DietPlan["status"], string> = {
  active: "bg-success/10 text-success border-success/20",
  finished: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<DietPlan["status"], string> = {
  active: "Ativo",
  finished: "Finalizado",
};

/**
 * parseISO, não `new Date`: a string vem só com a data ("2026-08-01") e o
 * construtor a lê como UTC. Formatada em fuso negativo, voltaria um dia.
 *
 * O isValid protege contra data corrompida no banco — o format do date-fns
 * LANÇA com data inválida, e uma linha ruim derrubaria a listagem inteira.
 */
function shortDate(value: string): string {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "d MMM", { locale: ptBR }) : "—";
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  return `${shortDate(start)} → ${shortDate(end)}`;
}

function formatMacros(plan: DietPlan): string {
  if (plan.target_calories === null) return "—";
  return `${plan.target_calories} kcal · P${plan.target_protein ?? 0} C${plan.target_carbs ?? 0} G${plan.target_fat ?? 0}`;
}

function StudentBadge({ student }: { student?: { full_name: string } }) {
  const name = student?.full_name ?? "Aluno sem nome";
  return (
    <span className="flex items-center gap-1.5 mt-0.5">
      <span className="w-4.5 h-4.5 shrink-0 rounded-full bg-surface-highlight border border-overlay-08 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="text-[11px] text-muted-foreground truncate">{name}</span>
    </span>
  );
}

/** Esqueleto no formato da tabela — um grid de cards aqui trocaria o layout no meio do carregamento. */
export function DietsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={`diet-skeleton-${index}`}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
        >
          <span className="flex-1 min-w-0 space-y-1.5">
            <span className="block h-3 w-2/5 rounded bg-overlay-10 animate-pulse" />
            <span className="block h-2.5 w-1/4 rounded bg-overlay-05 animate-pulse" />
          </span>
          <span className="hidden md:block w-20 h-3 rounded bg-overlay-05 animate-pulse" />
          <span className="hidden md:block w-40 h-3 rounded bg-overlay-05 animate-pulse" />
          <span className="hidden md:block w-32 h-3 rounded bg-overlay-05 animate-pulse" />
          <span className="hidden md:block w-24 h-5 rounded-full bg-overlay-10 animate-pulse" />
          <span className="w-8" />
        </div>
      ))}
    </div>
  );
}

export function DietsTable({ dietPlans, onView, onDelete }: DietsTableProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Cabeçalho some no mobile: 6 colunas não cabem, as linhas viram cartões empilhados */}
      <div className="hidden md:flex items-center gap-3 px-4 py-2.5 border-b border-border text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="flex-1">Plano</span>
        <span className="w-20">Tipo</span>
        <span className="w-40">Macros</span>
        <span className="w-32">Período</span>
        <span className="w-24">Status</span>
        <span className="w-8" />
      </div>

      <ul>
        {dietPlans.map((plan) => (
          <li key={plan.id} className="border-b border-border last:border-b-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 py-3 transition-colors hover:bg-overlay-05">
              <button
                type="button"
                onClick={() => onView(plan.id)}
                className="flex-1 min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
              >
                <span className="block text-[12.5px] font-bold text-foreground truncate">
                  {plan.name ?? "Plano sem nome"}
                </span>
                <StudentBadge student={plan.student} />
              </button>

              <span className="md:w-20 text-[11.5px] text-muted-foreground">
                {plan.plan_type === "unique" ? "Única" : "Cíclica"}
              </span>
              <span className="md:w-40 text-[11px] text-muted-foreground">
                {formatMacros(plan)}
              </span>
              <span className="md:w-32 text-[11.5px] text-muted-foreground">
                {formatPeriod(plan.start_date, plan.end_date)}
              </span>

              <span className="md:w-24">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[plan.status]}`}
                >
                  {STATUS_LABEL[plan.status]}
                </span>
              </span>

              <span className="md:w-8 flex md:justify-end">
                <button
                  type="button"
                  onClick={() => onDelete(plan.id)}
                  aria-label={`Excluir ${plan.name ?? "plano"}`}
                  title="Excluir"
                  className="p-1 rounded-md text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
