import type { BriefingSignal, BriefingSignalKind, BriefingTone } from "@elevapro/shared";
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

/** Os sinais de quem sumiu: o cartão ganha o "Mensagem" (#376, F8). */
const NEEDS_MESSAGE: readonly BriefingSignalKind[] = [
  "inactive",
  "meals_unlogged",
  "check_in_skipped",
];

interface AttentionCardProps {
  signal: BriefingSignal;
  /** O primeiro cartão ocupa o dobro: a lista é ranqueada, não uma grade. */
  emphasis?: boolean;
}

/**
 * Um sinal do painel. O cartão todo leva ao aluno; o "Mensagem", às notas
 * dele, que ele lê no relatório. Dois links irmãos, e não um dentro do outro:
 * link aninhado é HTML inválido.
 */
export function AttentionCard({ signal, emphasis = false }: AttentionCardProps) {
  const tone = TONE[signal.tone];
  const student = `/dashboard/students/${signal.studentId}`;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 ${
        emphasis ? "flex-[2_1_20rem] p-7" : "flex-[1_1_14rem] p-5"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${tone.bar}`} aria-hidden="true" />

      <p className={`font-display font-bold text-foreground ${emphasis ? "text-xl" : "text-base"}`}>
        <Link
          href={student}
          className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {signal.studentName}
        </Link>
      </p>
      <p
        className={`mt-2 leading-relaxed text-muted-foreground ${emphasis ? "text-[15px]" : "text-[13px]"}`}
      >
        {signal.message}
      </p>
      <div className="mt-3.5 flex items-center gap-4">
        <span className={`text-xs font-bold ${tone.text}`}>Revisar →</span>
        {NEEDS_MESSAGE.includes(signal.kind) ? (
          <Link
            href={`${student}#notes`}
            className="relative z-10 text-xs font-bold text-foreground underline-offset-4 hover:underline"
          >
            Mensagem
          </Link>
        ) : null}
      </div>
    </div>
  );
}
