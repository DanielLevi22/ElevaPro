"use client";

import type { BlocoDeContexto } from "../services/disponibilidade";

/**
 * A tira que abre a conversa dizendo com que dados o coach está trabalhando.
 *
 * Presente e ausente têm o mesmo peso visual de propósito: "sem avaliação
 * física" é informação que muda o que o especialista pergunta, não um erro que
 * ele precise corrigir antes de conversar.
 */
interface Props {
  blocos: BlocoDeContexto[];
}

export function ContextoDisponivel({ blocos }: Props) {
  if (blocos.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-surface/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        O que o assistente sabe deste aluno
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {blocos.map((bloco) => (
          <li key={bloco.key} className="flex items-baseline gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className={bloco.present ? "text-emerald-400" : "text-muted-foreground"}
            >
              {bloco.present ? "✓" : "—"}
            </span>
            <span className={bloco.present ? "text-foreground" : "text-muted-foreground"}>
              {bloco.label}
              <span className="sr-only">{bloco.present ? ": disponível" : ": indisponível"}</span>
            </span>
            {bloco.detail && <span className="text-muted-foreground/80">({bloco.detail})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
