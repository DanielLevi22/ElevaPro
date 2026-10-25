import type { RemainingTone } from "../utils/macroTotals";

// Classe literal por tom: o Tailwind não enxerga classe montada em runtime.
// Tokens de tema, não `white`/`zinc` cravados: o claro deixava o chip branco no branco.
const TONE_CHIP_CLASS: Record<RemainingTone, string> = {
  below: "bg-overlay-05 border-overlay-10 text-muted-foreground",
  met: "bg-primary/10 border-primary/30 text-primary-text",
  over: "bg-amber-400/10 border-amber-400/30 text-amber-700 dark:text-amber-400",
  none: "bg-transparent border-overlay-05 text-muted-foreground",
};

/**
 * Etiqueta de quanto falta ou passou da meta, colorida pelo tom.
 *
 * @example <RemainingChip {...describeRemaining(36, 180, "g")} />
 */
export function RemainingChip({
  text,
  tone,
  canWrap = false,
}: {
  text: string;
  tone: RemainingTone;
  /** Em coluna estreita, quebrar a linha é melhor que vazar do cartão. */
  canWrap?: boolean;
}) {
  const wrapClass = canWrap ? "text-center leading-tight" : "whitespace-nowrap";
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${wrapClass} ${TONE_CHIP_CLASS[tone]}`}
    >
      {text}
    </span>
  );
}
