"use client";

import type { Movimento } from "@elevapro/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCameras } from "../hooks/useCameras";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import { processarQuadro } from "../services/passe";

/**
 * A análise rodando ao vivo sobre a câmera.
 *
 * Julga com **exatamente** o mesmo código que o aparelho executa —
 * `avaliarAgachamento` e `fatosDeLandmarks` vêm de `@elevapro/shared`. Esta
 * tela não tem regra própria, e é isso que faz o limiar afinado aqui valer lá.
 *
 * Nada é gravado: o quadro morre no `requestAnimationFrame` e o que sobrevive
 * na memória é o contador.
 */

/**
 * De quanto em quanto tempo os números vão para o React.
 *
 * O julgador roda a cada quadro, mas re-renderizar 30 vezes por segundo para
 * mexer numa casa decimal é desperdício. O que **não** pode esperar — repetição
 * fechada e aviso novo — passa por fora deste limite.
 */
const ATUALIZACAO_MS = 100;

export function AnaliseAoVivo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const movimentoRef = useRef<Movimento | null>(null);
  const ultimoQuadroRef = useRef(-1);
  const ultimaPinturaRef = useRef(0);
  const animacaoRef = useRef<number | null>(null);

  const { landmarker, estado, erro } = usePoseLandmarker();
  const { cameras, recarregar } = useCameras();

  const [cameraId, setCameraId] = useState<string>("");
  const [rodando, setRodando] = useState(false);
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [mudo, setMudo] = useState(false);
  const mudoRef = useRef(false);

  // A fala acontece dentro do laço de animação, que não enxerga o estado do
  // React — sem o espelho em ref, ela usaria o valor do primeiro quadro para
  // sempre.
  useEffect(() => {
    mudoRef.current = mudo;
  }, [mudo]);

  const falar = useCallback((texto: string) => {
    if (mudoRef.current || typeof window === "undefined") return;
    if (!window.speechSynthesis) return;

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    // Cancela o que estava na fila: uma repetição não pode esperar a frase da
    // anterior terminar, senão a voz atrasa mais a cada agachamento.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(fala);
  }, []);

  const analisar = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!landmarker || !video || !canvas || video.readyState < 2) {
      animacaoRef.current = requestAnimationFrame(analisar);
      return;
    }

    // O `requestAnimationFrame` corre mais rápido que a câmera entrega. Sem
    // esta guarda, o mesmo quadro seria julgado várias vezes e o contador de
    // repetições andaria mais rápido que a pessoa.
    if (video.currentTime !== ultimoQuadroRef.current) {
      ultimoQuadroRef.current = video.currentTime;

      const anterior = movimentoRef.current;
      const { movimento: atual } = processarQuadro(landmarker, video, canvas, anterior);
      movimentoRef.current = atual;

      if (atual.veredito) falar(atual.veredito.texto);
      if (atual.aviso && atual.deveFalar) falar(atual.aviso.texto);

      const agora = performance.now();
      const fechou = atual.repeticoes !== (anterior?.repeticoes ?? 0);
      const avisoNovo = atual.aviso?.id !== anterior?.aviso?.id;

      if (fechou || avisoNovo || agora - ultimaPinturaRef.current > ATUALIZACAO_MS) {
        ultimaPinturaRef.current = agora;
        setMovimento(atual);
      }
    }

    animacaoRef.current = requestAnimationFrame(analisar);
  }, [landmarker, falar]);

  const comecar = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const fluxo = await navigator.mediaDevices.getUserMedia({
      video: cameraId ? { deviceId: { exact: cameraId } } : true,
    });

    video.srcObject = fluxo;
    await video.play();

    // Só depois da permissão o browser revela o rótulo das câmeras. Recarregar
    // aqui é o que transforma "Câmera 1" em "Redmi Note 14 Pro".
    await recarregar();

    movimentoRef.current = null;
    setMovimento(null);
    setRodando(true);
    animacaoRef.current = requestAnimationFrame(analisar);
  }, [analisar, cameraId, recarregar]);

  const parar = useCallback(() => {
    if (animacaoRef.current !== null) cancelAnimationFrame(animacaoRef.current);
    animacaoRef.current = null;

    const video = videoRef.current;
    const fluxo = video?.srcObject as MediaStream | null;
    for (const trilha of fluxo?.getTracks() ?? []) trilha.stop();
    if (video) video.srcObject = null;

    setRodando(false);
  }, []);

  // A câmera fica ligada até alguém desligá-la: sair da página sem parar as
  // trilhas deixa a luz do dispositivo acesa.
  useEffect(() => parar, [parar]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          disabled={rodando}
          onChange={(e) => setCameraId(e.target.value)}
          value={cameraId}
        >
          <option value="">Câmera padrão</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.nome}
            </option>
          ))}
        </select>

        <button
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          disabled={estado !== "pronto"}
          onClick={rodando ? parar : comecar}
          type="button"
        >
          {rodando ? "Parar" : "Analisar"}
        </button>

        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input checked={mudo} onChange={(e) => setMudo(e.target.checked)} type="checkbox" />
          Sem voz
        </label>

        {estado === "carregando" && (
          <span className="text-sm text-neutral-500">carregando o modelo…</span>
        )}
        {estado === "falhou" && (
          <span className="text-sm text-red-600">falhou ao carregar: {erro}</span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-black">
        <video className="w-full" muted playsInline ref={videoRef} />
        <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
      </div>

      <Painel movimento={movimento} />
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-neutral-500">{rotulo}</span>
      <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">{valor}</span>
    </div>
  );
}

function Painel({ movimento }: { movimento: Movimento | null }) {
  if (movimento === null) {
    return (
      <p className="text-sm text-neutral-500">
        Fique de lado para a câmera, com o corpo inteiro no quadro, e agache.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
          {movimento.repeticoes}
        </span>
        <span className="text-sm text-neutral-500">repetições</span>
      </div>

      <div className="flex flex-wrap gap-6">
        <Numero rotulo="fase" valor={movimento.fase} />
        <Numero
          rotulo="profundidade"
          valor={movimento.profundidade === null ? "—" : movimento.profundidade.toFixed(2)}
        />
        <Numero
          rotulo="mais fundo da repetição"
          valor={
            Number.isFinite(movimento.maiorProfundidade)
              ? movimento.maiorProfundidade.toFixed(2)
              : "—"
          }
        />
      </div>

      {movimento.aviso && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {movimento.aviso.texto}
        </p>
      )}

      <p className="text-xs text-neutral-500">
        Profundidade vale −1 em pé, 0 na paralela e positivo abaixo dela. &quot;Fundo&quot; é maior
        que zero.
      </p>
    </div>
  );
}
