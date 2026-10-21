"use client";

import type { RepsTarget } from "@elevapro/shared";
import { useId } from "react";

type Mode = RepsTarget["mode"];

const MODE_LABEL: Record<Mode, string> = {
  count: "Repetições",
  range: "Faixa",
  failure: "Até a falha",
  time: "Tempo (s)",
};

/** Ao trocar de modo, parte de um valor que já faz sentido no modo novo. */
const MODE_DEFAULT: Record<Mode, RepsTarget> = {
  count: { mode: "count", value: 12 },
  range: { mode: "range", min: 8, max: 12 },
  failure: { mode: "failure" },
  time: { mode: "time", seconds: 30 },
};

interface RepsFieldProps {
  value: RepsTarget;
  onChange: (value: RepsTarget) => void;
}

/**
 * O seletor "Repetições ▾" e os números de cada modo.
 *
 * @example <RepsField value={set.reps} onChange={(reps) => onChange({ ...set, reps })} />
 */
export function RepsField({ value, onChange }: RepsFieldProps) {
  const modeId = useId();

  return (
    <div className="space-y-1">
      <label htmlFor={modeId} className="block text-[11px] text-muted-foreground">
        Repetições
      </label>
      <div className="flex items-center gap-1.5">
        <select
          id={modeId}
          value={value.mode}
          onChange={(e) => onChange(MODE_DEFAULT[e.target.value as Mode])}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {(Object.keys(MODE_LABEL) as Mode[]).map((mode) => (
            // A lista nativa do select não herda o tema: sem fundo e cor próprios,
            // o texto claro do tema escuro some sobre o branco do sistema.
            <option key={mode} value={mode} className="bg-surface text-foreground">
              {MODE_LABEL[mode]}
            </option>
          ))}
        </select>
        <ModeNumbers value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/** Os números do modo escolhido; "até a falha" não tem número. */
function ModeNumbers({ value, onChange }: RepsFieldProps) {
  if (value.mode === "count") {
    const set = (n: number) => onChange({ mode: "count", value: n });
    return <PositiveInput label="Número de repetições" value={value.value} onChange={set} />;
  }
  if (value.mode === "time") {
    const set = (n: number) => onChange({ mode: "time", seconds: n });
    return <PositiveInput label="Segundos" value={value.seconds} onChange={set} />;
  }
  if (value.mode === "failure") return null;
  // A faixa se acerta quando o foco sai dela, e não a cada tecla: digitar "15"
  // passa por "1", e puxar o mínimo ali o estragaria. O schema recusa invertida.
  const reorder = () => {
    if (value.min > value.max) onChange({ ...value, min: value.max, max: value.min });
  };
  return (
    <>
      <PositiveInput
        label="Mínimo de repetições"
        value={value.min}
        onChange={(min) => onChange({ ...value, min })}
        onBlur={reorder}
      />
      <span className="text-xs text-muted-foreground">a</span>
      <PositiveInput
        label="Máximo de repetições"
        value={value.max}
        onChange={(max) => onChange({ ...value, max })}
        onBlur={reorder}
      />
    </>
  );
}

/** Inteiro de 1 para cima: campo vazio ou zero vira 1, que o schema aceita. */
function PositiveInput({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
}) {
  return (
    <input
      type="number"
      min={1}
      aria-label={label}
      onBlur={onBlur}
      value={value}
      onChange={(e) => onChange(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
      className="w-14 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}
