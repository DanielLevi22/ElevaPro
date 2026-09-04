"use client";

import type { Gravacao, PontoDaVarredura } from "@elevapro/shared";
import { conferirCorpus, MINIMO_DE_SERIES, sugerirLimiar, varrer } from "@elevapro/shared";
import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/shared/components/ui/DataTable";

/**
 * A varredura de limiar sobre um corpus de fixtures.
 *
 * Carrega os `.json` exportados pela análise de vídeo, roda o julgador de
 * verdade contra cada limiar candidato, e mostra o erro que cada um comete.
 *
 * **A sugestão é sugestão.** Quem escolhe é quem lê a matriz de confusão:
 * acurácia igual pode esconder erros de custo bem diferente — chamar de funda
 * uma repetição rasa valida justamente o que deveria corrigir.
 */

function pct(valor: number): string {
  return `${(valor * 100).toFixed(1)}%`;
}

export function Varredura() {
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;

    try {
      const lidas = await Promise.all(
        Array.from(arquivos).map(async (arquivo) => {
          const gravacao = JSON.parse(await arquivo.text()) as Gravacao;

          // Fixture sem rótulo ou sem quadros entraria na conta como corpus
          // válido e diluiria a acurácia sem ninguém perceber de onde veio.
          if (gravacao.rotulo !== "fundo" && gravacao.rotulo !== "faltou") {
            throw new Error(`${arquivo.name}: rótulo ausente ou desconhecido`);
          }
          if (!Array.isArray(gravacao.quadros) || gravacao.quadros.length === 0) {
            throw new Error(`${arquivo.name}: sem quadros`);
          }

          return gravacao;
        }),
      );

      setGravacoes(lidas);
      setErro(null);
    } catch (e) {
      setGravacoes([]);
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const pontos = useMemo(() => (gravacoes.length === 0 ? [] : varrer(gravacoes)), [gravacoes]);
  const sugestao = useMemo(() => sugerirLimiar(pontos), [pontos]);
  const saude = useMemo(() => conferirCorpus(gravacoes), [gravacoes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          accept="application/json"
          className="text-sm"
          multiple
          onChange={(e) => carregar(e.target.files)}
          type="file"
        />
        {saude.series > 0 && (
          <span className="text-sm text-neutral-500">
            {saude.series} séries — {saude.fundas} fundas, {saude.rasas} rasas
          </span>
        )}
      </div>

      {erro && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      {saude.rotuloUnico && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          O corpus só tem séries de um rótulo. Qualquer limiar que classifique tudo igual acerta
          100% — a varredura não separa nada e o número que ela sugerir não significa nada.
        </p>
      )}

      {saude.pequeno && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {saude.series} séries é pouco — abaixo de {MINIMO_DE_SERIES}, uma única série mal rotulada
          move a acurácia mais do que a diferença entre dois limiares vizinhos, e o platô que a
          tabela mostra é ruído. Dá para olhar, não dá para adotar o número.
        </p>
      )}

      {sugestao && (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">sugestão</p>
          <p className="font-mono text-2xl text-neutral-900 dark:text-neutral-100">
            {sugestao.limiar.toFixed(2)}
          </p>
          <p className="text-sm text-neutral-500">
            {pct(sugestao.acuracia)} de acerto em {sugestao.total} repetições. Confira a matriz
            abaixo antes de adotar: veja se ele está num platô largo ou numa borda.
          </p>
        </div>
      )}

      {pontos.length > 0 && (
        <DataTable<PontoDaVarredura>
          columns={[
            { key: "limiar", header: "Limiar", render: (p) => p.limiar.toFixed(2) },
            { key: "acuracia", header: "Acerto", render: (p) => pct(p.acuracia) },
            { key: "ff", header: "Funda → funda", render: (p) => p.fundoComoFundo },
            { key: "fr", header: "Funda → rasa", render: (p) => p.fundoComoFaltou },
            { key: "rr", header: "Rasa → rasa", render: (p) => p.faltouComoFaltou },
            {
              key: "rf",
              header: "Rasa → funda",
              render: (p) => (
                <span className={p.faltouComoFundo > 0 ? "text-red-600" : undefined}>
                  {p.faltouComoFundo}
                </span>
              ),
            },
            { key: "total", header: "Repetições", render: (p) => p.total },
          ]}
          rowKey={(p) => String(p.limiar)}
          rows={pontos}
        />
      )}

      <p className="text-xs text-neutral-500">
        &quot;Rasa → funda&quot; é a coluna que mais custa: é o app dizendo que estava fundo quando
        não estava, validando o erro que ele existe para corrigir.
      </p>
    </div>
  );
}
