"use client";

import { type SetPrescription, summarizeSetPlan } from "@elevapro/shared";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { MethodBadge } from "./MethodBadge";
import { MethodPicker } from "./MethodPicker";
import { NumberField } from "./NumberField";
import { RepsField } from "./RepsField";
import { SegmentList } from "./SegmentList";
import { asSeconds, asWeight, toggleMethod } from "./setPlanEditing";

interface SetCardProps {
  set: SetPrescription;
  number: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (set: SetPrescription) => void;
  onRemove: () => void;
}

/**
 * Uma série em acordeão: fechada mostra o resumo, aberta mostra técnicas,
 * repetições, peso, descanso, RIR e os blocos.
 *
 * @example <SetCard set={set} number={1} isOpen onToggleOpen={...} onChange={...} onRemove={...} />
 */
export function SetCard({ set, number, isOpen, onToggleOpen, onChange, onRemove }: SetCardProps) {
  const summary = summarizeSetPlan([set]);
  const details = [
    summary.reps,
    summary.weight,
    set.rest_seconds !== null ? `${set.rest_seconds}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-overlay-10 bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="shrink-0 text-sm font-semibold text-foreground">Série #{number}</span>
          <span className="flex min-w-0 flex-wrap gap-1">
            {set.methods
              .filter((id) => id !== "working")
              .map((id) => (
                <MethodBadge key={id} method={id} />
              ))}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{details}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover série ${number}`}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {isOpen ? (
        <div className="space-y-4 border-t border-overlay-10 px-3 py-3">
          <MethodPicker selected={set.methods} onToggle={(id) => onChange(toggleMethod(set, id))} />
          <div className="flex flex-wrap items-end gap-4">
            <RepsField value={set.reps} onChange={(reps) => onChange({ ...set, reps })} />
            <NumberField
              label="Peso (kg)"
              value={set.weight_kg}
              step={0.5}
              placeholder="Livre"
              onChange={(weight_kg) => onChange({ ...set, weight_kg: asWeight(weight_kg) })}
            />
            <NumberField
              label="Descanso (s)"
              value={set.rest_seconds}
              step={15}
              placeholder="Padrão"
              onChange={(rest_seconds) =>
                onChange({ ...set, rest_seconds: asSeconds(rest_seconds) })
              }
            />
          </div>
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Mais opções
            </summary>
            <div className="mt-2">
              <NumberField
                label="RIR alvo (0 a 5)"
                value={set.target_rir}
                min={0}
                max={5}
                placeholder="—"
                onChange={(target_rir) =>
                  onChange({
                    ...set,
                    target_rir:
                      target_rir === null ? null : Math.min(5, Math.max(0, Math.round(target_rir))),
                  })
                }
              />
            </div>
          </details>
          <SegmentList set={set} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
