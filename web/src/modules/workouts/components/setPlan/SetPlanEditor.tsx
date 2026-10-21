"use client";

import { MAX_SETS, type SetPlan } from "@elevapro/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SetCard } from "./SetCard";
import { appendSet, removeSet, replaceSet } from "./setPlanEditing";

interface SetPlanEditorProps {
  plan: SetPlan;
  onChange: (plan: SetPlan) => void;
}

/**
 * "Personalizando Séries": a lista de séries do exercício, uma aberta por vez,
 * e o "+ série" que copia a última.
 *
 * @example <SetPlanEditor plan={plan} onChange={setPlan} />
 */
export function SetPlanEditor({ plan, onChange }: SetPlanEditorProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const isFull = plan.length >= MAX_SETS;

  const add = () => {
    onChange(appendSet(plan));
    setOpenIndex(plan.length);
  };

  return (
    <div className="space-y-2">
      {plan.map((set, index) => (
        <SetCard
          // Séries não têm id próprio; a posição é o "Série #n" que o especialista vê.
          // biome-ignore lint/suspicious/noArrayIndexKey: ver comentário acima
          key={index}
          set={set}
          number={index + 1}
          isOpen={openIndex === index}
          onToggleOpen={() => setOpenIndex((current) => (current === index ? null : index))}
          onChange={(next) => onChange(replaceSet(plan, index, next))}
          onRemove={() => {
            onChange(removeSet(plan, index));
            setOpenIndex(null);
          }}
        />
      ))}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={add}
          disabled={isFull}
          className="inline-flex items-center gap-1 rounded-full border border-overlay-10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-overlay-05 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {isFull ? `Limite de ${MAX_SETS} séries` : "série"}
        </button>
      </div>
    </div>
  );
}
