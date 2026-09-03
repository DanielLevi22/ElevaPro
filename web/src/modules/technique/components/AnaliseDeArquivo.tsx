"use client";

import type { RotuloDaSerie } from "@elevapro/shared";
import { useAnaliseDeVideo } from "../hooks/useAnaliseDeVideo";
import { FundoDasRepeticoes } from "./FundoDasRepeticoes";
import { LeituraDoQuadro } from "./LeituraDoQuadro";
import { QuadroDeVideo } from "./QuadroDeVideo";
import { ResultadoDaAnalise } from "./ResultadoDaAnalise";

/**
 * Analisa um vídeo já gravado e exporta a série rotulada.
 *
 * **Este é o caminho que calibra, e o único que produz fixture.** O ao vivo
 * serve para ganhar intuição sobre um limiar; ele não pode gerar rótulo, porque
 * quem rotularia é quem está executando — e rótulo dado depois de ver o veredito
 * na tela não é gabarito independente.
 *
 * O formulário fica aqui e a análise fica no `useAnaliseDeVideo`: o que esta
 * tela decide é o rótulo, e ele precisa ser escolhido **antes** de o vídeo ser
 * analisado. É a ordem, e não um segundo revisor, que mantém o gabarito
 * independente do que a máquina acha.
 */

const ROTULOS: { valor: RotuloDaSerie; texto: string }[] = [
  { valor: "fundo", texto: "Todas no fundo (quadril passou da linha do joelho)" },
  { valor: "faltou", texto: "Todas rasas (quadril nao chegou ao joelho)" },
];

/**
 * Os exercicios da tela.
 *
 * Os indisponiveis aparecem desabilitados em vez de ausentes: mostram para onde
 * isto cresce sem fingir que ja cresceu. Cada um deles precisa do seu proprio
 * criterio, do seu proprio limiar calibrado e da sua propria vista de camera --
 * nao e uma opcao a mais num seletor, e um ciclo de calibracao inteiro.
 *
 * O corpus ja esta pronto para eles: a gravacao guarda os 33 landmarks, nao o
 * recorte do agachamento, entao os videos de hoje servem para calibrar o
 * criterio de amanha.
 */
const EXERCICIOS = [
  { valor: "agachamento", texto: "Agachamento", disponivel: true },
  { valor: "flexao", texto: "Flexao de braco", disponivel: false },
  { valor: "afundo", texto: "Afundo", disponivel: false },
];

export function AnaliseDeArquivo() {
  const analise = useAnaliseDeVideo();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {/*
          `defaultValue` e nao `value`: com um exercicio selecionavel so, este
          campo e read-only de verdade, e um `value` sem `onChange` faz o React
          avisar exatamente isso. Vira estado controlado quando o segundo
          exercicio entrar -- que e tambem quando havera o que escolher.
        */}
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          defaultValue="agachamento"
          disabled={analise.analisando}
        >
          {EXERCICIOS.map((exercicio) => (
            <option disabled={!exercicio.disponivel} key={exercicio.valor} value={exercicio.valor}>
              {exercicio.texto}
              {exercicio.disponivel ? "" : " — em breve"}
            </option>
          ))}
        </select>

        <label className="cursor-pointer rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
          {analise.nomeDoArquivo ?? "Escolher vídeo…"}
          {/* O input nativo fica escondido, e nao removido: e ele que abre o
              seletor de arquivo e carrega a acessibilidade do `label`. */}
          <input
            accept="video/*"
            className="sr-only"
            disabled={analise.analisando}
            onChange={(e) => analise.escolherArquivo(e.target.files?.[0])}
            type="file"
          />
        </label>

        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          disabled={analise.analisando}
          onChange={(e) => analise.definirRotulo(e.target.value as RotuloDaSerie)}
          value={analise.rotulo}
        >
          {ROTULOS.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </option>
          ))}
        </select>

        <button
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          disabled={analise.estado !== "pronto" || analise.analisando}
          onClick={analise.analisar}
          type="button"
        >
          {analise.analisando
            ? `Analisando… ${Math.round(analise.progresso * 100)}%`
            : "Analisar vídeo"}
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Rotule a série <strong>antes</strong> de analisar, e grave séries homogêneas — todas fundas
        ou todas rasas. Rotular depois, assistindo repetição a repetição, é o que faz projeto de
        dataset morrer na segunda semana.
      </p>

      <QuadroDeVideo
        canvasRef={analise.canvasRef}
        controles={!analise.analisando}
        videoRef={analise.videoRef}
      />

      {analise.truncada && (
        <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong>A análise parou antes do fim do vídeo.</strong> Ela encerra quando o vídeo pausa —
          então não use os controles do player enquanto ela roda. Os números abaixo cobrem só o
          trecho analisado. Clique em analisar de novo e deixe rodar até o fim.
        </p>
      )}

      {analise.leitura && <LeituraDoQuadro leitura={analise.leitura} />}

      <FundoDasRepeticoes fundos={analise.fundos} onIr={analise.irPara} />

      {analise.gravacao && (
        <ResultadoDaAnalise gravacao={analise.gravacao} onBaixar={analise.baixar} />
      )}
    </div>
  );
}
