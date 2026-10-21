"use client";

import { type SetPrescription, TRAINING_METHODS } from "@elevapro/shared";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { NumberField } from "./NumberField";
import { RepsField } from "./RepsField";
import { SetDetails } from "./SetDetails";
import {
  asSeconds,
  asWeight,
  extraMethodsOf,
  primaryTypeOf,
  SET_TYPES,
  withPrimaryType,
} from "./setPlanEditing";

const LABELS = new Map(TRAINING_METHODS.map((m) => [m.id, m.label]));

/** Colunas da tabela: o cabeçalho do editor usa as mesmas. */
export const SET_ROW_COLUMNS =
  "grid grid-cols-[1.25rem_minmax(7.5rem,1fr)_auto_4.75rem_4.75rem_3.75rem] items-center gap-2";

interface SetRowProps {
  set: SetPrescription;
  number: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (set: SetPrescription) => void;
  onRemove: () => void;
}

/** O que a linha fechada lembra que existe: extras, blocos e RIR. */
function hintsOf(set: SetPrescription): string[] {
  const blocks = set.segments.length;
  return [
    ...extraMethodsOf(set).map((id) => LABELS.get(id) ?? id),
    blocks > 0 ? `${blocks} ${blocks === 1 ? "bloco" : "blocos"}` : null,
    set.target_rir !== null ? `RIR ${set.target_rir}` : null,
  ].filter((hint): hint is string => hint !== null);
}

/**
 * Uma série como linha da tabela: tipo, repetições, peso e descanso editáveis
 * ali mesmo; o resto (extras, blocos, RIR) ao expandir.
 *
 * @example <SetRow set={set} number={1} isOpen={false} onToggleOpen={...} onChange={...} onRemove={...} />
 */
export function SetRow({ set, number, isOpen, onToggleOpen, onChange, onRemove }: SetRowProps) {
  const hints = hintsOf(set);

  return (
    <div className={cn("border-b border-overlay-10 last:border-b-0", isOpen && "bg-overlay-05")}>
      <div className={cn(SET_ROW_COLUMNS, "px-3 py-2")}>
        <span className="text-center text-xs font-semibold text-muted-foreground">{number}</span>
        <select
          aria-label={`Tipo da série ${number}`}
          value={primaryTypeOf(set)}
          onChange={(e) => onChange(withPrimaryType(set, e.target.value))}
          className="min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {SET_TYPES.map((type) => (
            // A lista nativa do select não herda o tema: fundo e cor próprios.
            <option key={type.id} value={type.id} className="bg-surface text-foreground">
              {type.label}
            </option>
          ))}
        </select>
        <RepsField hideLabel value={set.reps} onChange={(reps) => onChange({ ...set, reps })} />
        <NumberField
          hideLabel
          label={`Peso da série ${number} (kg)`}
          className="w-full"
          value={set.weight_kg}
          step={0.5}
          placeholder="Livre"
          onChange={(weight_kg) => onChange({ ...set, weight_kg: asWeight(weight_kg) })}
        />
        <NumberField
          hideLabel
          label={`Descanso da série ${number} (s)`}
          className="w-full"
          value={set.rest_seconds}
          step={15}
          placeholder="Padrão"
          onChange={(rest_seconds) => onChange({ ...set, rest_seconds: asSeconds(rest_seconds) })}
        />
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Fechar" : "Abrir"} técnicas e blocos da série ${number}`}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-overlay-10 hover:text-foreground"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
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
      </div>
      {!isOpen && hints.length > 0 ? (
        <button
          type="button"
          onClick={onToggleOpen}
          className="block w-full px-3 pb-2 pl-10 text-left text-[11px] text-muted-foreground hover:text-foreground"
        >
          {hints.join(" · ")}
        </button>
      ) : null}
      {isOpen ? <SetDetails set={set} onChange={onChange} /> : null}
    </div>
  );
}
