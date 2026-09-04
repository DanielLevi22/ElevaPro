import type { Leitura } from "../services/leituras";

/**
 * A leitura do quadro em que o vídeo está parado.
 *
 * Existe para responder "a medida faz sentido?" sem precisar de câmera ao vivo:
 * arraste até a pessoa em pé e a profundidade tem que estar perto de −1; até a
 * coxa paralela ao chão, perto de 0; abaixo disso, positiva. Se em pé não der
 * perto de −1, o problema não é o limiar — é o cálculo.
 */
export function LeituraDoQuadro({ leitura }: { leitura: Leitura }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">
        Arraste a barra do vídeo para ler qualquer instante.
      </p>

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">profundidade</span>
          <span className="font-mono text-2xl tabular-nums text-neutral-900 dark:text-neutral-100">
            {leitura.profundidade === null ? "—" : leitura.profundidade.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">fase</span>
          <span className="font-mono text-sm">{leitura.fase}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">repetições até aqui</span>
          <span className="font-mono text-sm">{leitura.repeticoes}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">tempo</span>
          <span className="font-mono text-sm">{leitura.tempo.toFixed(2)}s</span>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        −1 em pé · 0 com a coxa paralela ao chão · positivo abaixo da paralela. Se em pé não der
        perto de −1, o problema é o cálculo e não o limiar.
      </p>
    </div>
  );
}
