"use client";

import { useState } from "react";

/**
 * O lugar fixo da proposta na tela: entre a conversa e o campo de digitação.
 *
 * Enquanto o cartão morava dentro da lista de mensagens, ele era só o último
 * item dela — e por isso o texto que chegava depois entrava **antes** dele, o
 * cartão parecia pular de lugar, e enviar a próxima mensagem o fazia sumir com
 * a única via de aprovação junto. O coach chegou a responder que "não consegue
 * reapresentar o cartão" e mandar rolar a tela para cima, onde não havia nada.
 *
 * Proposta pendente não é mensagem: é uma ação esperando decisão. Fica parada
 * no mesmo canto até ser resolvida.
 *
 * A altura é limitada e a rolagem é interna porque três treinos de dez
 * exercícios ocupam mais que a tela — o painel não pode comer a conversa que
 * ele serve.
 */
interface Props {
  /** Título curto do que está pendente, visível mesmo recolhido. */
  titulo: string;
  /** Já foi salvo? Só então dá para fechar — antes, fechar tira a aprovação. */
  resolvido: boolean;
  onFechar: () => void;
  children: React.ReactNode;
}

export function PainelDeProposta({ titulo, resolvido, onFechar, children }: Props) {
  const [recolhido, setRecolhido] = useState(false);

  return (
    <section
      aria-label={titulo}
      className="shrink-0 border-t border-white/10 bg-background/80 backdrop-blur"
    >
      <div className="flex items-center gap-2 px-1 py-2">
        <button
          type="button"
          onClick={() => setRecolhido((r) => !r)}
          aria-expanded={!recolhido}
          className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true" className={recolhido ? "" : "rotate-90"}>
            ▸
          </span>
          {titulo}
          {resolvido && <span className="text-emerald-400 normal-case">· salvo</span>}
        </button>

        {/* Fechar só depois de resolvido: antes disso, o botão de aprovar mora
            aqui dentro, e fechar seria esconder o caminho. */}
        {resolvido && (
          <button
            type="button"
            onClick={onFechar}
            aria-label={`Fechar ${titulo}`}
            className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Fechar
          </button>
        )}
      </div>

      {!recolhido && (
        <div className="max-h-[42vh] overflow-y-auto pb-3 pr-1">
          <div className="mx-auto max-w-lg">{children}</div>
        </div>
      )}
    </section>
  );
}
