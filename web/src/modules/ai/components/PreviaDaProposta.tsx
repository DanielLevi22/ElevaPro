import type { Previa } from "../services/previaDaProposta";

/**
 * A proposta aparecendo enquanto o modelo a escreve.
 *
 * Ocupa o mesmo canto que o cartão vai ocupar, e some quando ele chega. Não
 * tem botão de propósito: o que está aqui ainda está sendo escrito, e aprovar
 * meia proposta salvaria o que ninguém leu inteiro.
 */
interface Props {
  previa: Previa;
}

export function PreviaDaProposta({ previa }: Props) {
  return (
    <section
      aria-label={`${previa.titulo} — sendo montada`}
      aria-live="polite"
      aria-busy="true"
      className="shrink-0 border-t border-white/10 bg-background/80 px-3 py-2.5 backdrop-blur"
    >
      <div className="mx-auto max-w-lg">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
          </span>
          {previa.titulo}
        </p>

        {/* Teto baixo e rolagem no fim: a lista cresce sozinha, e sem teto ela
            empurraria a conversa para fora da tela enquanto ninguém pediu. */}
        <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-sm">
          {previa.linhas.map((linha, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: a lista é relida do JSON a cada quadro e só cresce pelo fim — nunca reordena, e a posição é a identidade que existe; o mesmo exercício pode repetir em dois treinos, então só o texto não distingue
              key={`${i}-${linha.texto}`}
              className={
                linha.nivel === 0
                  ? "flex items-baseline gap-2 font-medium text-foreground"
                  : "flex items-baseline gap-2 pl-4 text-muted-foreground"
              }
            >
              <span className="truncate">{linha.texto}</span>
              {linha.detalhe && (
                <span className="shrink-0 text-xs text-muted-foreground">{linha.detalhe}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
