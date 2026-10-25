"use client";

import type { DietPlan } from "@elevapro/shared";
import type { ReactNode } from "react";
import { describeRemaining, type MacroTotals, type RemainingTone } from "../utils/macroTotals";
import { MacroRing } from "./MacroRing";
import { RemainingChip } from "./RemainingChip";

interface DayMacroProgressProps {
  dietPlan: DietPlan;
  /** Soma do que já foi adicionado nas refeições do dia selecionado. */
  consumed: MacroTotals;
  dayLabel: string;
}

const TONE_BAR_CLASS: Record<RemainingTone, string> = {
  below: "bg-muted-foreground",
  met: "bg-primary",
  over: "bg-amber-400",
  none: "bg-overlay-15",
};

interface CalorieBarProps {
  consumed: number;
  target: number;
  tone: RemainingTone;
}

function CalorieBar({ consumed, target, tone }: CalorieBarProps) {
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Calorias adicionadas no dia"
      aria-valuenow={Math.round(consumed)}
      aria-valuemin={0}
      aria-valuemax={target}
      className="w-full h-1.5 rounded-full bg-overlay-10 overflow-hidden my-2"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${TONE_BAR_CLASS[tone]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

const PROTEIN_ICON = (
  <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
  </svg>
);

const CARBS_ICON = (
  <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,14.21 4.9,16.21 6.34,17.65L7.75,16.24C6.67,15.16 6,13.66 6,12A6,6 0 0,1 12,6M16.25,7.76L17.66,6.35C19.1,7.79 20,9.79 20,12A8,8 0 0,1 12,20V17L8,21L12,25V22A10,10 0 0,0 22,12C22,9.24 20.9,6.74 19.1,5.05L16.25,7.76Z" />
  </svg>
);

const FAT_ICON = (
  <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.26,8.91C12.72,8.47 11.23,8.7 9.87,9.37l-0.2,0.1 0.1,0.2c0.41,0.85 0.54,1.82 0.44,2.83 -0.19,2.15 -1.24,4.11 -2.71,5.65L7.33,18.32 7.5,18.52c1.17,1.4 2.82,2.37 4.6,2.71l0.3,0.06 0.05,-0.3c0.11,-0.6 0.28,-1.19 0.51,-1.76l0.29,-0.74 0.77,0.24c0.14,0.04 0.28,0.08 0.42,0.12l0.28,0.08 0.06,-0.28c0.12,-0.6 0.16,-1.2 0.14,-1.82 -0.01,-0.2 -0.02,-0.4 -0.04,-0.6 -0.15,-1.72 -1.04,-3.21 -2.33,-4.2l-0.53,-0.4 0.45,-0.49c0.42,-0.46 0.94,-0.83 1.5,-1.11C14.77,9.8,15.75,9.74,16.63,10c0.31,0.09 0.6,0.22 0.88,0.4" />
  </svg>
);

interface MacroGoalProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  icon: ReactNode;
}

function MacroGoal({ label, consumed, target, color, icon }: MacroGoalProps) {
  const remaining = describeRemaining(consumed, target, "g");
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <MacroRing label={label} value={consumed} max={target} color={color} size="md" icon={icon} />
      <span className="text-[11px] text-muted-foreground">de {Math.round(target)}g</span>
      <RemainingChip text={remaining.text} tone={remaining.tone} canWrap />
    </div>
  );
}

/**
 * Painel de metas do plano com o progresso do dia: quanto já foi adicionado e quanto falta.
 *
 * @example <DayMacroProgress dietPlan={plan} consumed={sumMealsMacros(dayMeals)} dayLabel="Segunda" />
 */
export function DayMacroProgress({ dietPlan, consumed, dayLabel }: DayMacroProgressProps) {
  const targetCalories = dietPlan.target_calories ?? 0;
  const remainingCalories = describeRemaining(consumed.calories, targetCalories, " kcal");

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mt-8 bg-surface border border-border p-4 md:p-6 rounded-4xl w-full md:w-fit">
      <div className="flex flex-col items-center w-full md:w-auto pb-6 md:pb-0 md:px-6 border-b md:border-b-0 md:border-r border-border md:min-w-48">
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mb-1">
          {dayLabel ? `Total · ${dayLabel}` : "Total Calórico"}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-foreground italic tracking-tighter">
            {Math.round(consumed.calories)}
          </span>
          <span className="text-sm font-bold text-muted-foreground tracking-tighter">
            / {targetCalories}
          </span>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
            kcal
          </span>
        </div>
        <CalorieBar
          consumed={consumed.calories}
          target={targetCalories}
          tone={remainingCalories.tone}
        />
        <RemainingChip text={remainingCalories.text} tone={remainingCalories.tone} />
      </div>

      <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:gap-6">
        <MacroGoal
          label="Proteína"
          consumed={consumed.protein}
          target={dietPlan.target_protein ?? 0}
          color="#10b981"
          icon={PROTEIN_ICON}
        />
        <MacroGoal
          label="Carbo"
          consumed={consumed.carbs}
          target={dietPlan.target_carbs ?? 0}
          color="#3b82f6"
          icon={CARBS_ICON}
        />
        <MacroGoal
          label="Gordura"
          consumed={consumed.fat}
          target={dietPlan.target_fat ?? 0}
          color="#eab308"
          icon={FAT_ICON}
        />
      </div>
    </div>
  );
}
