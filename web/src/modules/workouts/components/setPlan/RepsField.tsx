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

const NUMBER_CLASS =
  "w-16 rounded-md border border-overlay-10 bg-white/5 px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

interface RepsFieldProps {
  value: RepsTarget;
  onChange: (value: RepsTarget) => void;
  label?: string;
}

/** O seletor "Repetições ▾" e os números de cada modo. */
export function RepsField({ value, onChange, label = "Repetições" }: RepsFieldProps) {
  const modeId = useId();
  const positive = (raw: string) => Math.max(1, Number.parseInt(raw, 10) || 1);

  return (
    <div className="space-y-1">
      <label htmlFor={modeId} className="block text-[11px] text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <select
          id={modeId}
          value={value.mode}
          onChange={(e) => onChange(MODE_DEFAULT[e.target.value as Mode])}
          className="rounded-md border border-overlay-10 bg-white/5 px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {(Object.keys(MODE_LABEL) as Mode[]).map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABEL[mode]}
            </option>
          ))}
        </select>
        {value.mode === "count" ? (
          <input
            type="number"
            min={1}
            aria-label="Número de repetições"
            value={value.value}
            onChange={(e) => onChange({ mode: "count", value: positive(e.target.value) })}
            className={NUMBER_CLASS}
          />
        ) : null}
        {value.mode === "range" ? (
          <>
            <input
              type="number"
              min={1}
              aria-label="Mínimo de repetições"
              value={value.min}
              onChange={(e) => onChange({ ...value, min: positive(e.target.value) })}
              className={NUMBER_CLASS}
            />
            <span className="text-xs text-muted-foreground">a</span>
            <input
              type="number"
              min={1}
              aria-label="Máximo de repetições"
              value={value.max}
              onChange={(e) => onChange({ ...value, max: positive(e.target.value) })}
              className={NUMBER_CLASS}
            />
          </>
        ) : null}
        {value.mode === "time" ? (
          <input
            type="number"
            min={1}
            aria-label="Segundos"
            value={value.seconds}
            onChange={(e) => onChange({ mode: "time", seconds: positive(e.target.value) })}
            className={NUMBER_CLASS}
          />
        ) : null}
      </div>
    </div>
  );
}
