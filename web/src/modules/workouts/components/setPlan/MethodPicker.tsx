"use client";

import { TRAINING_METHODS, type TrainingMethod, type TrainingMethodGroup } from "@elevapro/shared";
import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";
import { MethodBadge } from "@/shared/components/ui/MethodBadge";
import { METHOD_GROUP_LABEL, METHOD_GROUP_TONE } from "@/shared/components/ui/methodTone";
import { cn } from "@/shared/utils/cn";

const GROUPS = Object.keys(METHOD_GROUP_LABEL) as TrainingMethodGroup[];
const BY_GROUP = new Map(GROUPS.map((g) => [g, TRAINING_METHODS.filter((m) => m.group === g)]));
const BY_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

interface MethodPickerProps {
  selected: string[];
  onToggle: (id: string) => void;
}

/**
 * As técnicas da série: as escolhidas como etiquetas, a lista por grupo para
 * marcar e desmarcar, e o (i) com a explicação e o artigo de cada uma.
 *
 * @example <MethodPicker selected={set.methods} onToggle={(id) => update(toggleMethod(set, id))} />
 */
export function MethodPicker({ selected, onToggle }: MethodPickerProps) {
  const [isListOpen, setIsListOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const chosen = selected.flatMap((id) => BY_ID.get(id) ?? []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {chosen.length > 0 ? (
          chosen.map((m) => <MethodBadge key={m.id} method={m.id} />)
        ) : (
          <span className="text-xs text-muted-foreground">Nenhuma técnica marcada</span>
        )}
        <button
          type="button"
          onClick={() => setIsListOpen((open) => !open)}
          aria-expanded={isListOpen}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-overlay-10 px-2 py-1 text-xs text-foreground hover:bg-overlay-05"
        >
          Técnicas
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", isListOpen && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={() => setIsInfoOpen((open) => !open)}
          aria-expanded={isInfoOpen}
          aria-label="Como funcionam as técnicas desta série"
          className="rounded-md p-1 text-muted-foreground hover:bg-overlay-05 hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {isListOpen ? <MethodList selected={selected} onToggle={onToggle} /> : null}
      {isInfoOpen ? <MethodInfo methods={chosen} /> : null}
    </div>
  );
}

function MethodList({ selected, onToggle }: MethodPickerProps) {
  return (
    <div className="space-y-2 rounded-lg border border-overlay-10 bg-background/40 p-3">
      {GROUPS.map((group) => (
        <fieldset key={group}>
          <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {METHOD_GROUP_LABEL[group]}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {BY_GROUP.get(group)?.map((m) => {
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
                  {m.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function MethodInfo({ methods }: { methods: TrainingMethod[] }) {
  if (methods.length === 0) {
    return (
      <p className="rounded-lg border border-overlay-10 p-3 text-xs text-muted-foreground">
        Marque uma técnica para ver como ela funciona e o que a pesquisa diz.
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border border-overlay-10 bg-background/40 p-3">
      <p className="text-xs font-semibold text-foreground">Técnicas desta série</p>
      {methods.map((m) => (
        <div key={m.id} className="space-y-1">
          <MethodBadge method={m.id} />
          <p className="text-xs leading-relaxed text-muted-foreground">{m.explanation}</p>
          {m.reference ? (
            <a
              href={m.reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-primary-text underline-offset-2 hover:underline"
            >
              {m.reference.label} ↗
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
