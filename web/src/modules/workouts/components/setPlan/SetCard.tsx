"use client";

import { type SetPrescription, summarizeSetPlan, TRAINING_METHODS } from "@elevapro/shared";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { MethodBadge } from "@/shared/components/ui/MethodBadge";
import { cn } from "@/shared/utils/cn";
import { MethodInfo } from "./MethodInfo";
import { MethodSearch } from "./MethodSearch";
import { NumberField } from "./NumberField";
import { RepsField } from "./RepsField";
import { SegmentList } from "./SegmentList";
import { asSeconds, asWeight, toggleMethod } from "./setPlanEditing";

const BY_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

interface SetCardProps {
  set: SetPrescription;
  number: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (set: SetPrescription) => void;
  onRemove: () => void;
}

/**
 * Uma série em acordeão. Fechada, o resumo: técnicas, repetições, carga e
 * descanso. Aberta, as técnicas escolhidas (quantas a série precisar), os
 * campos, os blocos e como fazer cada técnica, com o artigo.
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
  const shown = set.methods.filter((id) => id !== "working");

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface",
        isOpen ? "border-primary/30" : "border-overlay-10",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="shrink-0 text-sm font-semibold text-foreground">Série {number}</span>
          <span className="flex min-w-0 flex-wrap gap-1">
            {shown.length > 0 ? (
              shown.map((id) => <MethodBadge key={id} method={id} />)
            ) : (
              <span className="text-[11px] text-muted-foreground">Normal</span>
            )}
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

      {isOpen ? <SetBody set={set} onChange={onChange} /> : null}
    </div>
  );
}

function SetBody({
  set,
  onChange,
}: {
  set: SetPrescription;
  onChange: (set: SetPrescription) => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const shown = set.methods.filter((id) => id !== "working");
  const explained = shown.flatMap((id) => BY_ID.get(id) ?? []);

  return (
    <div className="space-y-4 border-t border-overlay-10 px-3 py-3">
      <section className="space-y-2">
        <h4 className="text-[11px] font-semibold text-foreground">Técnicas</h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {shown.map((id) => (
            <span key={id} className="inline-flex items-center gap-0.5">
              <MethodBadge method={id} />
              <button
                type="button"
                onClick={() => onChange(toggleMethod(set, id))}
                aria-label={`Tirar ${BY_ID.get(id)?.label ?? id} da série`}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setIsSearching((open) => !open)}
            aria-expanded={isSearching}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-overlay-10 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            {isSearching ? "Fechar lista" : "Adicionar técnica"}
          </button>
        </div>
        {isSearching ? (
          <MethodSearch selected={set.methods} onToggle={(id) => onChange(toggleMethod(set, id))} />
        ) : null}
      </section>

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
          onChange={(rest_seconds) => onChange({ ...set, rest_seconds: asSeconds(rest_seconds) })}
        />
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

      <section className="space-y-1.5">
        <h4 className="text-[11px] font-semibold text-foreground">Blocos de repetição</h4>
        <SegmentList set={set} onChange={onChange} />
      </section>

      {explained.length > 0 ? (
        <section className="space-y-1.5">
          <h4 className="text-[11px] font-semibold text-foreground">Como fazer</h4>
          <MethodInfo methods={explained} />
        </section>
      ) : null}
    </div>
  );
}
