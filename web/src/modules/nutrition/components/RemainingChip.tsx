import type { RemainingTone } from "../utils/macroTotals";

// Classe literal por tom: o Tailwind não enxerga classe montada em runtime.
const TONE_CHIP_CLASS: Record<RemainingTone, string> = {
  below: "bg-white/5 border-white/10 text-zinc-300",
  met: "bg-primary/10 border-primary/30 text-primary",
  over: "bg-amber-400/10 border-amber-400/30 text-amber-400",
  none: "bg-transparent border-white/5 text-zinc-600",
};

/**
 * Etiqueta de quanto falta ou passou da meta, colorida pelo tom.
 *
 * @example <RemainingChip {...describeRemaining(36, 180, "g")} />
 */
export function RemainingChip({ text, tone }: { text: string; tone: RemainingTone }) {
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${TONE_CHIP_CLASS[tone]}`}
    >
      {text}
    </span>
  );
}
