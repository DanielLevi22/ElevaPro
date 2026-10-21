"use client";

import { TRAINING_METHODS, type TrainingMethodGroup } from "@elevapro/shared";
import { Search } from "lucide-react";
import { useState } from "react";
import { METHOD_GROUP_LABEL, METHOD_GROUP_TONE } from "@/shared/components/ui/methodTone";
import { cn } from "@/shared/utils/cn";

// O tipo da série (estrutura) tem o seletor próprio na linha; aqui ficam as extras.
const GROUPS: TrainingMethodGroup[] = ["execution", "pairing", "scheme", "timed"];
const BY_GROUP = new Map(GROUPS.map((g) => [g, TRAINING_METHODS.filter((m) => m.group === g)]));

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

interface ExtraMethodsProps {
  selected: string[];
  onToggle: (id: string) => void;
}

/**
 * As técnicas extras da série por grupo, com busca: forma de executar, ligação
 * com outro exercício, esquema e por tempo.
 *
 * @example <ExtraMethods selected={extraMethodsOf(set)} onToggle={(id) => onChange(toggleMethod(set, id))} />
 */
export function ExtraMethods({ selected, onToggle }: ExtraMethodsProps) {
  const [query, setQuery] = useState("");
  const needle = normalize(query.trim());

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar técnica (ex.: isometria, bi-set)"
          aria-label="Buscar técnica extra"
          className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {GROUPS.map((group) => {
        const methods = (BY_GROUP.get(group) ?? []).filter(
          (m) => !needle || normalize(m.label).includes(needle),
        );
        if (methods.length === 0) return null;
        return (
          <fieldset key={group}>
            <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {METHOD_GROUP_LABEL[group]}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {methods.map((m) => {
                const isOn = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={isOn}
                    title={m.explanation}
                    onClick={() => onToggle(m.id)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                      isOn
                        ? METHOD_GROUP_TONE[m.group]
                        : "border-overlay-10 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {isOn ? "✓ " : "+ "}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
