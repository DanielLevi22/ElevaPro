import type { FundoDaRepeticao } from "../services/leituras";

/**
 * O fundo de cada repetição, clicável.
 *
 * Clicar leva o vídeo ao instante exato — é a resposta para "essa repetição
 * passou da paralela?" sem ninguém precisar caçar o quadro.
 */
export function FundoDasRepeticoes({
  fundos,
  onIr,
}: {
  fundos: FundoDaRepeticao[];
  onIr: (tempo: number) => void;
}) {
  if (fundos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        O ponto mais fundo de cada repetição
      </p>
      <p className="text-xs text-neutral-500">
        Clique numa linha para levar o vídeo até aquele instante e conferir com os próprios olhos.
      </p>

      <ul className="flex flex-col">
        {fundos.map((fundo) => (
          <li key={fundo.indice}>
            <button
              className="flex w-full items-center gap-4 rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => onIr(fundo.tempo)}
              type="button"
            >
              <span className="w-6 text-neutral-500">{fundo.indice}</span>
              <span className="w-20 font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {fundo.maisFundo.toFixed(2)}
              </span>
              <span
                className={
                  fundo.veredito === "fundo" ? "w-16 text-emerald-600" : "w-16 text-neutral-500"
                }
              >
                {fundo.veredito}
              </span>
              <span className="font-mono text-xs text-neutral-500">{fundo.tempo.toFixed(2)}s</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
