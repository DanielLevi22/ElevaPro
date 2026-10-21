"use client";

import { MAX_SEGMENTS, type SetPrescription, type SetSegment } from "@elevapro/shared";
import { Plus, Trash2 } from "lucide-react";
import { MethodChips } from "./MethodChips";
import { NumberField } from "./NumberField";
import { RepsField } from "./RepsField";
import { appendSegment, asSeconds, asWeight, toggleSegmentMethod } from "./setPlanEditing";

interface SegmentListProps {
  set: SetPrescription;
  onChange: (set: SetPrescription) => void;
}

/**
 * Os blocos de repetição da série — como o especialista monta rest-pause,
 * drop-set e cluster. O sistema não calcula carga nem pausa: ele preenche.
 *
 * @example <SegmentList set={set} onChange={update} />
 */
export function SegmentList({ set, onChange }: SegmentListProps) {
  const replace = (index: number, segment: SetSegment) =>
    onChange({ ...set, segments: set.segments.map((s, i) => (i === index ? segment : s)) });
  const remove = (index: number) =>
    onChange({ ...set, segments: set.segments.filter((_, i) => i !== index) });
  const isFull = set.segments.length >= MAX_SEGMENTS;

  return (
    <div className="space-y-2">
      {set.segments.map((segment, index) => (
        <div
          // Blocos não têm id próprio; a posição é a identidade deles na série.
          // biome-ignore lint/suspicious/noArrayIndexKey: ver comentário acima
          key={index}
          className="space-y-2 rounded-lg border border-overlay-10 bg-background/40 p-2.5"
        >
          <div className="flex flex-wrap items-end gap-3">
            <span className="self-center text-[11px] font-semibold text-muted-foreground">
              Bloco {index + 1}
            </span>
            <NumberField
              label="Pausa antes (s)"
              value={segment.pause_seconds}
              onChange={(v) => replace(index, { ...segment, pause_seconds: asSeconds(v) ?? 0 })}
            />
            <RepsField
              value={segment.reps}
              onChange={(reps) => replace(index, { ...segment, reps })}
            />
            <NumberField
              label="Peso (kg)"
              value={segment.weight_kg}
              step={0.5}
              placeholder="Livre"
              onChange={(v) => replace(index, { ...segment, weight_kg: asWeight(v) })}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remover bloco ${index + 1}`}
              className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {/* Técnicas só deste bloco: o último drop em parcial, um bloco com isometria. */}
          <MethodChips
            selected={segment.methods}
            onToggle={(id) => replace(index, toggleSegmentMethod(segment, id))}
            owner={`do bloco ${index + 1}`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(appendSegment(set))}
        disabled={isFull}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-text hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        <Plus className="h-3.5 w-3.5" />
        {isFull ? `Limite de ${MAX_SEGMENTS} blocos` : "Adicionar bloco de repetição"}
      </button>
    </div>
  );
}
