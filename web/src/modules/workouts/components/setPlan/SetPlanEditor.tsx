"use client";

import { MAX_SETS, type SetPlan } from "@elevapro/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SetCard } from "./SetCard";
import { appendSet, applyRestToAll, removeSet, replaceSet } from "./setPlanEditing";

interface SetPlanEditorProps {
  plan: SetPlan;
  onChange: (plan: SetPlan) => void;
}

/**
 * "Personalizando Séries": um cartão por série, uma aberta por vez; o "+ série"
 * copia a última, e o descanso da série 1 vale para todas num clique.
 *
 * @example <SetPlanEditor plan={plan} onChange={setPlan} />
 */
export function SetPlanEditor({ plan, onChange }: SetPlanEditorProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const isFull = plan.length >= MAX_SETS;
  const firstRest = plan[0]?.rest_seconds ?? null;
  const restDiffers = plan.some((set) => set.rest_seconds !== firstRest);

  const add = () => {
    onChange(appendSet(plan));
    setOpenIndex(plan.length);
  };

  return (
    <div className="space-y-2">
      {plan.map((set, index) => (
        <SetCard
          // Séries não têm id próprio; a posição é o número que o especialista vê.
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
      {plan.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nenhuma série. Adicione a primeira.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={add}
          disabled={isFull}
          className="inline-flex items-center gap-1 rounded-full border border-overlay-10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-overlay-05 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {isFull ? `Limite de ${MAX_SETS} séries` : "Série (copia a última)"}
        </button>
        {restDiffers ? (
          <button
            type="button"
            onClick={() => onChange(applyRestToAll(plan, firstRest))}
            className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-overlay-05 hover:text-foreground"
          >
            Usar o descanso da série 1 em todas
          </button>
        ) : null}
      </div>
    </div>
  );
}
