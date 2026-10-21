"use client";

import { TRAINING_METHODS, visibleMethodIds } from "@elevapro/shared";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { MethodBadge } from "@/shared/components/ui/MethodBadge";
import { MethodSearch } from "./MethodSearch";

const LABELS = new Map(TRAINING_METHODS.map((m) => [m.id, m.label]));

interface MethodChipsProps {
  selected: string[];
  onToggle: (id: string) => void;
  /** A quem as técnicas pertencem, para o leitor de tela: "da série", "do bloco 2". */
  owner: string;
}

/**
 * As técnicas escolhidas como etiquetas, cada uma com o × para tirar, e o
 * "Adicionar técnica" que abre o catálogo com busca. Serve a série e o bloco.
 *
 * @example <MethodChips selected={set.methods} onToggle={toggle} owner="da série" />
 */
export function MethodChips({ selected, onToggle, owner }: MethodChipsProps) {
  const [isSearching, setIsSearching] = useState(false);
  const shown = visibleMethodIds(selected);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((id) => (
          <span key={id} className="inline-flex items-center gap-0.5">
            <MethodBadge method={id} />
            <button
              type="button"
              onClick={() => onToggle(id)}
              aria-label={`Tirar ${LABELS.get(id) ?? id} ${owner}`}
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
      {isSearching ? <MethodSearch selected={selected} onToggle={onToggle} /> : null}
    </div>
  );
}
