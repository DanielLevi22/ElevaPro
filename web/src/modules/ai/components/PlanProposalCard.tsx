"use client";

import { Button } from "@/shared/components/ui/Button";
import type { PlanProposalData } from "../types";

interface Props {
  data: PlanProposalData;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanProposalCard({ data, loading, onApprove, onReject }: Props) {
  const { workout, nutrition, goal_summary, reasoning } = data;

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div className="bg-surface border border-primary/30 rounded-2xl p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Proposta de Plano</h4>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
            Aguardando aprovação
          </span>
        </div>

        {/* Goal summary */}
        {goal_summary && (
          <div className="bg-primary/10 rounded-xl px-4 py-3">
            <p className="text-sm text-primary font-medium">{goal_summary}</p>
          </div>
        )}

        {/* Workout plan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Treino
            </p>
            <p className="text-xs text-muted-foreground">
              {workout.split_name} · {workout.days_per_week}x/sem · {workout.duration_weeks} sem
            </p>
          </div>
          <div className="space-y-1.5">
            {workout.days.map((day, i) => (
              <div
                key={`${day.day_label}-${i}`}
                className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{day.day_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {day.muscle_groups.join(", ")} · {day.exercise_count} exercícios ·{" "}
                    {day.duration_min} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Nutrição
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Calorias", value: `${nutrition.daily_calories}`, unit: "kcal" },
              { label: "Proteína", value: `${nutrition.protein_g}`, unit: "g" },
              { label: "Carbs", value: `${nutrition.carbs_g}`, unit: "g" },
              { label: "Gordura", value: `${nutrition.fat_g}`, unit: "g" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{unit}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{nutrition.strategy}</p>
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">{reasoning}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button fullWidth onClick={onApprove} isLoading={loading}>
            {loading ? "Salvando..." : "Aprovar plano"}
          </Button>
          <Button fullWidth variant="secondary" onClick={onReject} disabled={loading}>
            Ajustar
          </Button>
        </div>
      </div>
    </div>
  );
}
