"use client";

import { useEffect, useRef, useState } from "react";

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
  // Proposta já resolvida abre recolhida: quem reabre a conversa quer ler a
  // conversa, e o que estava decidido não precisa ocupar meia tela para isso.
  const [recolhido, setRecolhido] = useState(resolvido);
  const eraResolvido = useRef(resolvido);

  // Recolhe ao deixar de haver decisão a tomar, e expande quando volta a haver.
  // Só nas transições: quem mexeu no botão não é desfeito pelas costas no
  // próximo render.
  //
  // A volta existe porque o painel não desmonta entre uma proposta e a
  // seguinte. Aprovar a fase 1 o recolhia, e a proposta da fase 2 chegava para
  // um painel já fechado — o cartão novo ficava escondido atrás de um cabeçalho
  // que ainda era o da decisão anterior, e a leitura era "ele não trouxe nada"
  // ou "ficou o cartão de antes".
  useEffect(() => {
    if (resolvido !== eraResolvido.current) setRecolhido(resolvido);
    eraResolvido.current = resolvido;
  }, [resolvido]);

  return (
    <section
      aria-label={titulo}
      // O teto é porcentagem do espaço de conversa, não da janela. Com `vh` o
      // painel media 42% da tela inteira — em janela baixa isso é quase tudo o
      // que sobra depois do cabeçalho, e a conversa ficava com uma linha.
      //
      // Enquanto há decisão a tomar o teto é 82%: uma proposta de quatro
      // treinos com sete exercícios cada não cabe em 45% de nada, e o que
      // sobrava era uma janelinha por onde o cartão passava aos pedaços —
      // ninguém revisa prescrição rolando 300px de cada vez. Entre uma conversa
      // já lida e a decisão que está sendo pedida, é a decisão que precisa da
      // tela; recolher devolve a conversa inteira, e o cabeçalho continua
      // visível dizendo o que está pendente.
      //
      // Resolvida, o painel volta a ser rodapé: já não há o que revisar.
      className={`flex shrink-0 flex-col border-t border-white/10 bg-background/80 backdrop-blur ${
        resolvido ? "max-h-[60%] sm:max-h-[45%]" : "max-h-[82%] sm:max-h-[78%]"
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 px-1 py-2">
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
          {resolvido && <span className="normal-case text-emerald-400">· salvo</span>}
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
        <div className="overflow-y-auto pb-3 pr-1">
          {/* `max-w-lg` era 512px num painel que ocupa a largura toda: o
              cartão saía estreito e alto, e a altura é justamente o que não
              cabe. Mais largura é menos rolagem pela mesma informação. */}
          <div className="mx-auto max-w-3xl">{children}</div>
        </div>
      )}
    </section>
  );
}
