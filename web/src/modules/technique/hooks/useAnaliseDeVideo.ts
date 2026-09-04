"use client";

import type { Gravacao, LandmarkNormalizado, Movimento, RotuloDaSerie } from "@elevapro/shared";
import { serializarGravacao } from "@elevapro/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type FundoDaRepeticao,
  fundosPorRepeticao,
  type Leitura,
  leituraEm,
} from "../services/leituras";
import { desenharEsqueleto, processarQuadro } from "../services/passe";
import { type EstadoDoLandmarker, usePoseLandmarker } from "./usePoseLandmarker";

/**
 * A análise de um vídeo de arquivo, do play ao download da fixture.
 *
 * Está atrás de um hook, e não espalhada no componente, porque o que ela faz é
 * uma coisa só com muitas partes: tocar o vídeo, ler cada quadro pelo julgador,
 * guardar a leitura de cada instante, e transformar tudo isso numa fixture. O
 * componente que a usa só precisa saber quando começar e o que mostrar.
 *
 * **O vídeo nunca sai do browser.** O que se exporta são os fatos de cada
 * quadro: boneco de palito, sem imagem e sem rosto.
 */

/**
 * A versão do runtime que produziu a fixture.
 *
 * Viaja dentro da gravação porque o corpus é calibrado no WASM do browser e
 * julgado pelo AAR do Android. Fixture sem essa marca não deixa comparar as
 * duas leituras quando elas divergirem.
 */
const VERSAO_DO_MODELO = "0.10.35";

export interface AnaliseDeVideo {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  estado: EstadoDoLandmarker;
  rotulo: RotuloDaSerie;
  definirRotulo: (rotulo: RotuloDaSerie) => void;
  nomeDoArquivo: string | null;
  escolherArquivo: (arquivo: File | undefined) => void;
  analisando: boolean;
  progresso: number;
  analisar: () => Promise<void>;
  /** A análise encerrou antes do fim do vídeo — os números cobrem só um trecho. */
  truncada: boolean;
  leitura: Leitura | null;
  fundos: FundoDaRepeticao[];
  irPara: (tempo: number) => void;
  gravacao: Gravacao | null;
  baixar: () => void;
}

export function useAnaliseDeVideo(): AnaliseDeVideo {
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
  const [truncada, setTruncada] = useState(false);

  const escolherArquivo = useCallback((arquivo: File | undefined) => {
    const video = videoRef.current;
    if (!arquivo || !video) return;

    setGravacao(null);
    setProgresso(0);
    setLeitura(null);
    setLeituras([]);
    setTruncada(false);
    setNomeDoArquivo(arquivo.name);
    video.src = URL.createObjectURL(arquivo);
    video.currentTime = 0;
  }, []);

  const analisar = useCallback(async () => {
    const video = videoRef.current;
    if (!landmarker || !video?.src) return;

    setAnalisando(true);
    setGravacao(null);
    // Solta o ouvinte da barra antes de comecar: com ele atado, o redesenho do
    // quadro guardado briga com o desenho ao vivo e o esqueleto para de seguir.
    setLeituras([]);
    setLeitura(null);

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

    // O laco encerra quando o video pausa, e pausar no meio produz resultado
    // parcial. Sem este aviso, uma analise interrompida se apresenta como
    // completa -- e foi assim que uma serie de cinco repeticoes virou uma.
    const chegouAoFim = video.duration > 0 && video.currentTime >= video.duration - 0.5;
    setTruncada(!chegouAoFim);

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

  // O calculo varre todas as leituras; sem memo ele rodaria a cada `timeupdate`,
  // varias vezes por segundo sobre milhares de quadros.
  const fundos = useMemo(() => fundosPorRepeticao(leituras), [leituras]);

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
    // `analisando` na guarda, e nao so o `setLeituras([])` do inicio da analise:
    // aquele estado chega assincrono, e o ouvinte poderia sobreviver aos
    // primeiros quadros e brigar com o desenho ao vivo.
    if (!video || analisando || leituras.length === 0) return;

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
  }, [leituras, analisando]);

  return {
    videoRef,
    canvasRef,
    estado,
    rotulo,
    definirRotulo: setRotulo,
    nomeDoArquivo,
    escolherArquivo,
    analisando,
    progresso,
    analisar,
    truncada,
    leitura,
    fundos,
    irPara,
    gravacao,
    baixar,
  };
}
