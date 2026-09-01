"use client";

import type {
  Fase,
  Gravacao,
  LandmarkNormalizado,
  Movimento,
  RotuloDaSerie,
} from "@elevapro/shared";
import {
  conferir,
  diagnosticar,
  LIMIARES_PADRAO,
  motivoDominante,
  serializarGravacao,
} from "@elevapro/shared";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import { desenharEsqueleto, processarQuadro } from "../services/passe";
import { QuadroDeVideo } from "./QuadroDeVideo";

/**
 * Analisa um vídeo já gravado e exporta a série rotulada.
 *
 * **Este é o caminho que calibra, e o único que produz fixture.** O ao vivo
 * serve para ganhar intuição sobre um limiar; ele não pode gerar rótulo, porque
 * quem rotularia é quem está executando — e rótulo não-cego é exatamente o
 * viés que o portão de concordância entre dois profissionais existe para pegar.
 *
 * O vídeo nunca sai do browser. O que se exporta são os fatos de cada quadro:
 * boneco de palito, sem imagem e sem rosto.
 */

const VERSAO_DO_MODELO = "0.10.35";

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

/**
 * O que o julgador viu num instante do vídeo.
 *
 * Guardado por quadro para que arrastar a barra do vídeo mostre a leitura
 * daquele ponto. Sem isto, a única forma de conferir se a medida faz sentido
 * seria com câmera ao vivo — o que exige uma câmera bem posicionada, e é
 * exatamente o que não se tem quando se está diagnosticando enquadramento.
 */
interface Leitura {
  tempo: number;
  profundidade: number | null;
  fase: Fase;
  repeticoes: number;
  pontos: NormalizedLandmark[];
}

/**
 * A leitura mais próxima de um instante, por busca binária.
 *
 * Linear seria O(n) a cada `timeupdate`, que dispara várias vezes por segundo
 * sobre um vetor de milhares de quadros.
 */
function leituraEm(leituras: Leitura[], tempo: number): Leitura | null {
  if (leituras.length === 0) return null;

  let inicio = 0;
  let fim = leituras.length - 1;

  while (inicio < fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (leituras[meio].tempo < tempo) inicio = meio + 1;
    else fim = meio;
  }

  const candidato = leituras[inicio];
  const anterior = leituras[Math.max(0, inicio - 1)];

  return Math.abs(anterior.tempo - tempo) < Math.abs(candidato.tempo - tempo)
    ? anterior
    : candidato;
}

/** O ponto mais fundo de uma repetição, e quando ele aconteceu. */
interface FundoDaRepeticao {
  indice: number;
  maisFundo: number;
  tempo: number;
  veredito: "fundo" | "faltou";
}

/**
 * O fundo de cada repetição, extraído das leituras.
 *
 * Existe porque caçar o ponto mais fundo arrastando a barra é trabalhoso e
 * impreciso: entre duas repetições há dezenas de quadros, e o extremo dura
 * frações de segundo. O julgador já sabe onde ele está — basta mostrar.
 *
 * As repetições são separadas pelo instante em que o contador incrementa, que é
 * o mesmo instante em que o julgador fecha a repetição.
 */
function fundosPorRepeticao(leituras: Leitura[]): FundoDaRepeticao[] {
  const fundos: FundoDaRepeticao[] = [];
  let maisFundo = Number.NEGATIVE_INFINITY;
  let tempo = 0;

  for (const leitura of leituras) {
    if (leitura.profundidade !== null && leitura.profundidade > maisFundo) {
      maisFundo = leitura.profundidade;
      tempo = leitura.tempo;
    }

    if (leitura.repeticoes === fundos.length + 1) {
      fundos.push({
        indice: leitura.repeticoes,
        maisFundo,
        tempo,
        veredito: maisFundo >= LIMIARES_PADRAO.fundo ? "fundo" : "faltou",
      });
      maisFundo = Number.NEGATIVE_INFINITY;
    }
  }

  return fundos;
}

export function AnaliseDeArquivo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { landmarker, estado } = usePoseLandmarker();

  const [rotulo, setRotulo] = useState<RotuloDaSerie>("fundo");
  const [analisando, setAnalisando] = useState(false);
  const [gravacao, setGravacao] = useState<Gravacao | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  // Estado, e não `ref`: é a chegada das leituras que precisa reatar os
  // ouvintes da barra do vídeo, e um `ref` deixaria o React cego para isso.
  const [leituras, setLeituras] = useState<Leitura[]>([]);

  const escolherArquivo = useCallback((arquivo: File | undefined) => {
    const video = videoRef.current;
    if (!arquivo || !video) return;

    setGravacao(null);
    setProgresso(0);
    setLeitura(null);
    setLeituras([]);
    setNomeDoArquivo(arquivo.name);
    video.src = URL.createObjectURL(arquivo);
    video.currentTime = 0;
  }, []);

  const analisar = useCallback(async () => {
    const video = videoRef.current;
    if (!landmarker || !video?.src) return;

    setAnalisando(true);
    setGravacao(null);

    const quadros: LandmarkNormalizado[][] = [];
    const lidas: Leitura[] = [];
    let movimento: Movimento | null = null;
    let ultimoTempo = -1;

    await video.play();

    // Roda enquanto o vídeo toca, em vez de varrer por `seek`: o `seek` quadro
    // a quadro é mais preciso, mas o MediaPipe exige timestamps crescentes e o
    // `seeked` do browser não garante um quadro novo a cada chamada — a
    // varredura ficava presa repetindo o mesmo quadro.
    await new Promise<void>((resolve) => {
      const laco = () => {
        if (video.ended || video.paused) {
          resolve();
          return;
        }

        if (video.currentTime !== ultimoTempo) {
          ultimoTempo = video.currentTime;

          const passe = processarQuadro(landmarker, video, canvasRef.current, movimento);
          movimento = passe.movimento;
          quadros.push(passe.pontos);
          lidas.push({
            tempo: video.currentTime,
            profundidade: passe.movimento.profundidade,
            fase: passe.movimento.fase,
            repeticoes: passe.movimento.repeticoes,
            pontos: passe.pontos,
          });

          if (video.duration > 0) {
            setProgresso(Math.min(1, video.currentTime / video.duration));
          }
        }

        requestAnimationFrame(laco);
      };

      requestAnimationFrame(laco);
    });

    setLeituras(lidas);
    setLeitura(lidas[0] ?? null);

    setGravacao({
      exercicio: "agachamento",
      rotulo,
      versaoDoModelo: VERSAO_DO_MODELO,
      gravadoEm: new Date().toISOString(),
      quadros,
    });
    setAnalisando(false);
  }, [landmarker, rotulo]);

  const irPara = useCallback((tempo: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = tempo;
  }, []);

  const baixar = useCallback(() => {
    if (!gravacao) return;

    const blob = new Blob([serializarGravacao(gravacao)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `agachamento-${gravacao.rotulo}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [gravacao]);

  // Arrastar a barra do vídeo mostra a leitura daquele instante e redesenha o
  // esqueleto. `seeked` sozinho não basta: quem só dá play sem arrastar
  // continuaria vendo o primeiro quadro.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || leituras.length === 0) return;

    const acompanhar = () => {
      const atual = leituraEm(leituras, video.currentTime);
      if (!atual) return;

      setLeitura(atual);
      if (canvasRef.current) desenharEsqueleto(canvasRef.current, video, atual.pontos);
    };

    video.addEventListener("timeupdate", acompanhar);
    video.addEventListener("seeked", acompanhar);

    return () => {
      video.removeEventListener("timeupdate", acompanhar);
      video.removeEventListener("seeked", acompanhar);
    };
  }, [leituras]);

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
          disabled={analisando}
        >
          {EXERCICIOS.map((exercicio) => (
            <option disabled={!exercicio.disponivel} key={exercicio.valor} value={exercicio.valor}>
              {exercicio.texto}
              {exercicio.disponivel ? "" : " — em breve"}
            </option>
          ))}
        </select>

        <label className="cursor-pointer rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
          {nomeDoArquivo ?? "Escolher vídeo…"}
          {/* O input nativo fica escondido, e nao removido: e ele que abre o
              seletor de arquivo e carrega a acessibilidade do `label`. */}
          <input
            accept="video/*"
            className="sr-only"
            disabled={analisando}
            onChange={(e) => escolherArquivo(e.target.files?.[0])}
            type="file"
          />
        </label>

        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          disabled={analisando}
          onChange={(e) => setRotulo(e.target.value as RotuloDaSerie)}
          value={rotulo}
        >
          {ROTULOS.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </option>
          ))}
        </select>

        <button
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          disabled={estado !== "pronto" || analisando}
          onClick={analisar}
          type="button"
        >
          {analisando ? `Analisando… ${Math.round(progresso * 100)}%` : "Analisar vídeo"}
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Rotule a série <strong>antes</strong> de analisar, e grave séries homogêneas — todas fundas
        ou todas rasas. Rotular depois, assistindo repetição a repetição, é o que faz projeto de
        dataset morrer na segunda semana.
      </p>

      <QuadroDeVideo canvasRef={canvasRef} controles videoRef={videoRef} />

      {leitura && <LeituraDoQuadro leitura={leitura} />}

      {leituras.length > 0 && (
        <FundoDasRepeticoes fundos={fundosPorRepeticao(leituras)} onIr={irPara} />
      )}

      {gravacao && <Resultado gravacao={gravacao} onBaixar={baixar} />}
    </div>
  );
}

function Resultado({ gravacao, onBaixar }: { gravacao: Gravacao; onBaixar: () => void }) {
  const { acertos, erros, total } = conferir(gravacao);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">repetições detectadas</span>
          <span className="font-mono text-sm">{total}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">de acordo com o rótulo</span>
          <span className="font-mono text-sm">{acertos}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">em desacordo</span>
          <span className="font-mono text-sm">{erros}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">quadros</span>
          <span className="font-mono text-sm">{gravacao.quadros.length}</span>
        </div>
      </div>

      {total === 0 && <PorQueNadaFoiDetectado gravacao={gravacao} />}

      <button
        className="self-start rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        onClick={onBaixar}
        type="button"
      >
        Baixar fixture (.json)
      </button>
    </div>
  );
}

/**
 * Por que a gravação não rendeu repetição.
 *
 * "Nenhuma repetição detectada" é verdade e não ajuda: quem filmou de frente e
 * quem cortou os pés do quadro liam a mesma frase. O diagnóstico conta os
 * quadros por motivo e transforma o aviso em instrução.
 */
function PorQueNadaFoiDetectado({ gravacao }: { gravacao: Gravacao }) {
  const diagnostico = diagnosticar(gravacao.quadros);
  const motivo = motivoDominante(diagnostico);
  const pctDe = (n: number) =>
    diagnostico.quadros === 0 ? "0%" : `${Math.round((n / diagnostico.quadros) * 100)}%`;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <p className="font-semibold">Nenhuma repetição detectada</p>

      {motivo === "de-frente" && (
        <p>
          Em {pctDe(diagnostico.deFrente)} dos quadros a pessoa estava{" "}
          <strong>de frente ou de costas</strong> para a câmera. Precisa ser{" "}
          <strong>de lado</strong>: um ombro apontando para a câmera, o olhar para uma parede a 90°
          dela. De frente, a coxa aponta para a lente e some na projeção — o cálculo de profundidade
          devolveria um número plausível e errado, então o julgador prefere calar.
        </p>
      )}

      {motivo === "sem-articulacao" && (
        <p>
          Em {pctDe(diagnostico.semArticulacao)} dos quadros faltou{" "}
          <strong>quadril, joelho ou tornozelo</strong> no enquadramento. Afaste a câmera até o
          corpo inteiro caber, da cabeça aos pés, durante todo o movimento — inclusive no ponto mais
          fundo.
        </p>
      )}

      {motivo === null && (
        <p>
          O enquadramento estava legível em {pctDe(diagnostico.aptos)} dos quadros, então o problema
          não é a câmera. O mais provável é que o movimento não tenha completado o ciclo: o julgador
          só fecha uma repetição quando a pessoa desce e volta a estender por completo.
        </p>
      )}

      <p className="text-xs opacity-80">
        {diagnostico.quadros} quadros — {diagnostico.aptos} legíveis, {diagnostico.deFrente} de
        frente, {diagnostico.semArticulacao} com articulação fora do quadro.
      </p>
    </div>
  );
}

/**
 * A leitura do quadro em que o vídeo está parado.
 *
 * Existe para responder "a medida faz sentido?" sem precisar de câmera ao vivo:
 * arraste até a pessoa em pé e a profundidade tem que estar perto de −1; até a
 * coxa paralela ao chão, perto de 0; abaixo disso, positiva. Se em pé não der
 * perto de −1, o problema não é o limiar — é o cálculo.
 */
function LeituraDoQuadro({ leitura }: { leitura: Leitura }) {
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

/**
 * O fundo de cada repetição, clicável.
 *
 * Clicar leva o vídeo ao instante exato — é a resposta para "essa repetição
 * passou da paralela?" sem ninguém precisar caçar o quadro.
 */
function FundoDasRepeticoes({
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
