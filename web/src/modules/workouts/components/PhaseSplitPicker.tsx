"use client";

import { useState } from "react";

const SPLITS = ["A", "AB", "ABC", "ABCD", "ABCDE", "ABCDEF"];

interface PhaseSplitPickerProps {
  /** A divisão atual, pelas fichas da fase — "AB". Vazio antes da primeira. */
  split: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  /** A divisão escolhida; quem chama confirma antes de recriar as fichas. */
  onPick: (split: string) => void;
}

/**
 * O seletor da divisão de treino: as seis prontas e uma personalizada.
 *
 * O aberto/fechado fica com a página, porque o vazio da lista também abre o seletor.
 *
 * @example <PhaseSplitPicker split="AB" open={open} onOpenChange={setOpen} disabled={false} onPick={setPendingSplit} />
 */
export function PhaseSplitPicker({
  split,
  open,
  onOpenChange,
  disabled,
  onPick,
}: PhaseSplitPickerProps) {
  const pick = (chosen: string) => {
    onOpenChange(false);
    onPick(chosen);
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Divisão de Treino
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          disabled={disabled}
          className="flex items-center gap-2 bg-overlay-05 border border-overlay-10 px-4 py-2.5 rounded-xl hover:bg-overlay-10 transition-colors disabled:opacity-50"
        >
          <span className="text-foreground font-bold text-lg uppercase">{split || "--"}</span>
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 bg-surface border border-overlay-10 rounded-xl shadow-xl z-20 p-2 flex flex-col gap-1 min-w-40">
            {SPLITS.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => pick(option)}
                className="px-4 py-2 rounded-lg text-left text-sm font-bold hover:bg-primary/10 hover:text-primary transition-colors text-foreground"
              >
                {option}
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  ({option.length} ficha{option.length !== 1 ? "s" : ""})
                </span>
              </button>
            ))}
            <CustomSplitInput onPick={pick} />
          </div>
        )}
      </div>
    </div>
  );
}

function CustomSplitInput({ onPick }: { onPick: (split: string) => void }) {
  const [custom, setCustom] = useState("");
  return (
    <div className="border-t border-overlay-10 mt-1 pt-2 px-1">
      <p className="text-xs text-muted-foreground mb-1.5 px-1">Personalizado</p>
      <div className="flex gap-1">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          placeholder="Ex: ABCBAC"
          maxLength={12}
          className="flex-1 min-w-0 bg-overlay-05 border border-overlay-10 rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono uppercase"
        />
        <button
          type="button"
          disabled={custom.length === 0}
          onClick={() => onPick(custom)}
          className="px-2 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-primary-hover transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
