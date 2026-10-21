"use client";

import {
  MAX_TARGET_RIR,
  MIN_TARGET_RIR,
  type SetPrescription,
  summarizeSetPlan,
  TRAINING_METHODS,
  visibleMethodIds,
} from "@elevapro/shared";
import { ChevronDown, Trash2 } from "lucide-react";
import { MethodBadge } from "@/shared/components/ui/MethodBadge";
import { cn } from "@/shared/utils/cn";
import { MethodChips } from "./MethodChips";
import { MethodInfo } from "./MethodInfo";
import { NumberField } from "./NumberField";
import { RepsField } from "./RepsField";
import { SegmentList } from "./SegmentList";
import { asSeconds, asTargetRir, asWeight, toggleMethod } from "./setPlanEditing";

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
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface",
        isOpen ? "border-primary/30" : "border-overlay-10",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <SetHeader set={set} number={number} isOpen={isOpen} onToggleOpen={onToggleOpen} />
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

/** A série fechada de relance: número, técnicas, repetições, carga e descanso. */
function SetHeader({
  set,
  number,
  isOpen,
  onToggleOpen,
}: Pick<SetCardProps, "set" | "number" | "isOpen" | "onToggleOpen">) {
  const summary = summarizeSetPlan([set]);
  const rest = set.rest_seconds !== null ? `${set.rest_seconds}s` : null;
  const details = [summary.reps, summary.weight, rest].filter(Boolean).join(" · ");
  const shown = visibleMethodIds(set.methods);

  return (
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
  );
}

function SetBody({
  set,
  onChange,
}: {
  set: SetPrescription;
  onChange: (set: SetPrescription) => void;
}) {
  const shown = visibleMethodIds(set.methods);
  // As técnicas da série e as dos blocos, cada uma explicada uma vez.
  const explainedIds = new Set([...shown, ...set.segments.flatMap((segment) => segment.methods)]);
  const explained = [...explainedIds].flatMap((id) => BY_ID.get(id) ?? []);

  return (
    <div className="space-y-4 border-t border-overlay-10 px-3 py-3">
      <section className="space-y-2">
        <h4 className="text-[11px] font-semibold text-foreground">Técnicas</h4>
        <MethodChips
          selected={set.methods}
          onToggle={(id) => onChange(toggleMethod(set, id))}
          owner="da série"
        />
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
          min={MIN_TARGET_RIR}
          max={MAX_TARGET_RIR}
          placeholder="—"
          onChange={(target_rir) => onChange({ ...set, target_rir: asTargetRir(target_rir) })}
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
