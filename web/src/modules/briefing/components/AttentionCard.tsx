import type { BriefingSignal, BriefingTone } from "@elevapro/shared";
import Link from "next/link";

/**
 * Tons literais porque o Tailwind só gera classe que aparece inteira no fonte —
 * montar `text-${tone}` em runtime produz classe que não existe no CSS.
 */
const TONE: Record<BriefingTone, { bar: string; text: string }> = {
  danger: { bar: "bg-destructive", text: "text-destructive" },
  warning: { bar: "bg-warning", text: "text-warning" },
  success: { bar: "bg-success", text: "text-success" },
};

interface AttentionCardProps {
  signal: BriefingSignal;
  /** O primeiro cartão ocupa o dobro: a lista é ranqueada, não uma grade. */
  emphasis?: boolean;
}

export function AttentionCard({ signal, emphasis = false }: AttentionCardProps) {
  const tone = TONE[signal.tone];

  return (
    <Link
      href={`/dashboard/students/${signal.studentId}`}
      className={`group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        emphasis ? "flex-[2_1_20rem] p-7" : "flex-[1_1_14rem] p-5"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${tone.bar}`} aria-hidden="true" />

      <p className={`font-display font-bold text-foreground ${emphasis ? "text-xl" : "text-base"}`}>
        {signal.studentName}
      </p>
      <p
        className={`mt-2 leading-relaxed text-muted-foreground ${emphasis ? "text-[15px]" : "text-[13px]"}`}
      >
        {signal.message}
      </p>
      <span className={`mt-3.5 inline-block text-xs font-bold ${tone.text}`}>Revisar →</span>
    </Link>
  );
}
