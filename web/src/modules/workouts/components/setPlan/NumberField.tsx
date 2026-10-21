"use client";

import { useId } from "react";
import { parseOptionalNumber } from "./setPlanEditing";

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

/** Número opcional de uma série ou bloco: vazio vira `null`. */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min = 0,
  max,
  step = 1,
}: NumberFieldProps) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[11px] text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(parseOptionalNumber(e.target.value))}
        className="w-24 rounded-md border border-overlay-10 bg-white/5 px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
