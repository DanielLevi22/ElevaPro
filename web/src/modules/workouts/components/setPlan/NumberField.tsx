"use client";

import { useId } from "react";
import { cn } from "@/shared/utils/cn";
import { parseOptionalNumber } from "./setPlanEditing";

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Na tabela, o cabeçalho da coluna já diz o que é: o rótulo fica só para leitor de tela. */
  hideLabel?: boolean;
  className?: string;
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
  hideLabel = false,
  className = "w-24",
}: NumberFieldProps) {
  const id = useId();
  return (
    <div className={hideLabel ? undefined : "space-y-1"}>
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "block text-[11px] text-muted-foreground"}
      >
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
        className={cn(
          className,
          "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary",
        )}
      />
    </div>
  );
}
