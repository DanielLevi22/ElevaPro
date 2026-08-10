"use client";

import { MAX_DATE, MIN_DATE } from "@/shared/utils/formatDate";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Nao aceita data anterior a esta. Use para impedir fim antes do inicio. */
  min?: string;
  max?: string;
  className?: string;
}

/**
 * Campo de data com faixa aceita embutida.
 *
 * Existe porque `<input type="date">` cru aceita ano ate 275760: foi assim que
 * "12312-12-23" entrou no banco e quebrou a listagem de periodizacoes. Os
 * limites ficam aqui para nao serem reescritos — nem esquecidos — em cada tela.
 *
 * @example
 * <DateField label="Início" value={startDate} onChange={setStartDate} required />
 */
export function DateField({
  value,
  onChange,
  label,
  name,
  required,
  disabled,
  min,
  max,
  className = "",
}: DateFieldProps) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      )}
      <input
        type="date"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        // O navegador barra o que estiver fora da faixa antes do submit.
        min={min ?? MIN_DATE}
        max={max ?? MAX_DATE}
        className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-[13px] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-60"
      />
    </label>
  );
}
