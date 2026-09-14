"use client";

import { Button } from "@/shared/components/ui/Button";
import { formatDateRange } from "@/shared/utils/formatDate";
import type { DietMealsProposal, DietPlanProposal } from "../types";

const DIA_MS = 86_400_000;

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function addWeeks(isoDate: string, weeks: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`).getTime();
  if (Number.isNaN(base)) return isoDate;
  return new Date(base + weeks * 7 * DIA_MS).toISOString().slice(0, 10);
}

interface PlanProps {
  data: DietPlanProposal;
  saved: boolean;
  loading: boolean;
  onApprove: () => void;
  onAdjust: () => void;
}

/** As metas do plano: o que o especialista precisa conferir antes de existir dieta. */
export function DietPlanProposalCard({ data, saved, loading, onApprove, onAdjust }: PlanProps) {
  const macros: [string, number][] = [
    ["Proteína", data.target_protein],
    ["Carboidrato", data.target_carbs],
    ["Gordura", data.target_fat],
  ];

  return (
    <div className="mx-auto max-w-lg">
      <div className="space-y-4 rounded-2xl border border-primary/30 bg-surface p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Proposta de Plano Alimentar</h4>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              saved ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
            }`}
          >
            {saved ? "✓ Salvo" : "Aguardando aprovação"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="font-medium text-foreground">{data.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="font-medium text-foreground">
              {data.plan_type === "cyclic" ? "Cíclica (por dia)" : "Única (todos os dias)"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Período</p>
            <p className="font-medium text-foreground">
              {formatDateRange(
                data.start_date,
                addWeeks(data.start_date, data.duration_weeks),
                "medium",
              )}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <p className="font-display text-xl font-extrabold text-foreground">
            {data.target_calories}
            <span className="ml-1 text-xs font-normal text-muted-foreground">kcal / dia</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {macros.map(([rotulo, gramas]) => (
              <p key={rotulo} className="text-xs text-muted-foreground">
                {rotulo} <span className="font-bold text-foreground">{gramas}g</span>
              </p>
            ))}
          </div>
        </div>

        {data.notes ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{data.notes}</p>
            {/* A observação do plano aparece ao aluno como "Do seu especialista"
                (issue #298). Quem aprova precisa saber disso antes de salvar uma
                nota que julgava interna. */}
            <p className="text-[11px] text-muted-foreground/80">
              O aluno lê esta observação no app.
            </p>
          </div>
        ) : null}

        {!saved && (
          <div className="flex gap-2 pt-1">
            <Button fullWidth size="sm" onClick={onApprove} isLoading={loading}>
              Aprovar e Salvar
            </Button>
            <Button fullWidth size="sm" variant="secondary" onClick={onAdjust} disabled={loading}>
              Ajustar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MealsProps {
  data: DietMealsProposal;
  saved: boolean;
  loading: boolean;
  onApprove: () => void;
  onAdjust: () => void;
}

/**
 * As refeições, com a prescrição inteira.
 *
 * Alimento e quantidade aparecem item a item de propósito: aprovar vendo só
 * "4 refeições" é aprovar no escuro — foi a queixa que o cartão de treino teve.
 */
export function DietMealsProposalCard({ data, saved, loading, onApprove, onAdjust }: MealsProps) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="space-y-4 rounded-2xl border border-primary/30 bg-surface p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Proposta de Refeições</h4>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              saved ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
            }`}
          >
            {saved ? "✓ Salvas" : "Aguardando aprovação"}
          </span>
        </div>

        <div className="space-y-2">
          {data.meals.map((meal, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: chave composta nome-índice em lista só de leitura, que nunca reordena nem sofre insercao no meio; o indice so desempata nomes repetidos
            <div key={`${meal.name}-${i}`} className="rounded-lg bg-white/5 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{meal.name}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {[meal.meal_time, meal.day_of_week !== undefined ? DIAS[meal.day_of_week] : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <ul className="mt-1.5 space-y-1">
                {meal.items.map((item, j) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: chave composta nome-índice em lista só de leitura, que nunca reordena nem sofre insercao no meio; o indice so desempata nomes repetidos
                    key={`${item.food_name}-${j}`}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-foreground/90">{item.food_name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {item.quantity}
                      {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {!saved && (
          <div className="flex gap-2 pt-1">
            <Button fullWidth size="sm" onClick={onApprove} isLoading={loading}>
              Aprovar e Salvar
            </Button>
            <Button fullWidth size="sm" variant="secondary" onClick={onAdjust} disabled={loading}>
              Ajustar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
