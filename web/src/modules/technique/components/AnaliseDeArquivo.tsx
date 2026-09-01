"use client";

import type { Gravacao, LandmarkNormalizado, Movimento, RotuloDaSerie } from "@elevapro/shared";
import { conferir } from "@elevapro/shared";
import { useCallback, useRef, useState } from "react";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import { processarQuadro } from "../services/passe";

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

export function AnaliseDeArquivo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { landmarker, estado } = usePoseLandmarker();

  const [rotulo, setRotulo] = useState<RotuloDaSerie>("fundo");
  const [analisando, setAnalisando] = useState(false);
  const [gravacao, setGravacao] = useState<Gravacao | null>(null);
  const [progresso, setProgresso] = useState(0);

  const escolherArquivo = useCallback((arquivo: File | undefined) => {
    const video = videoRef.current;
    if (!arquivo || !video) return;

    setGravacao(null);
    setProgresso(0);
    video.src = URL.createObjectURL(arquivo);
    video.currentTime = 0;
  }, []);

  const analisar = useCallback(async () => {
    const video = videoRef.current;
    if (!landmarker || !video?.src) return;

    setAnalisando(true);
    setGravacao(null);

    const quadros: LandmarkNormalizado[][] = [];
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

          if (video.duration > 0) {
            setProgresso(Math.min(1, video.currentTime / video.duration));
          }
        }

        requestAnimationFrame(laco);
      };

      requestAnimationFrame(laco);
    });

    setGravacao({
      exercicio: "agachamento",
      rotulo,
      versaoDoModelo: VERSAO_DO_MODELO,
      gravadoEm: new Date().toISOString(),
      quadros,
    });
    setAnalisando(false);
  }, [landmarker, rotulo]);

  const baixar = useCallback(() => {
    if (!gravacao) return;

    const blob = new Blob([JSON.stringify(gravacao, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `agachamento-${gravacao.rotulo}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [gravacao]);

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

        <input
          accept="video/*"
          className="text-sm"
          disabled={analisando}
          onChange={(e) => escolherArquivo(e.target.files?.[0])}
          type="file"
        />

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

      <div className="relative overflow-hidden rounded-xl bg-black">
        <video className="w-full" controls muted playsInline ref={videoRef} />
        <canvas className="pointer-events-none absolute inset-0 h-full w-full" ref={canvasRef} />
      </div>

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

      {total === 0 && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Nenhuma repetição detectada. Isso não é acerto — é o julgador não tendo enxergado o
          movimento. Confira se a pessoa está de perfil e com o corpo inteiro no quadro.
        </p>
      )}

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
