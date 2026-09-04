import {
  avaliarAgachamento,
  type FatosDoMovimento,
  fatosDeLandmarks,
  type Movimento,
} from "@elevapro/shared";
import { DrawingUtils, type NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";

/**
 * O trabalho de um quadro, igual para câmera e para arquivo.
 *
 * O que difere entre os dois modos é o ciclo de vida da fonte — permissão e
 * trilhas de um lado, `play` e fim do vídeo do outro. O passe em si é o mesmo,
 * e é o único pedaço que precisa ser: se ele divergisse, o limiar afinado sobre
 * arquivo não valeria para o que a câmera mostra ao vivo.
 */

interface Passe {
  movimento: Movimento;
  fatos: FatosDoMovimento;
  /** Os 33 landmarks crus. É o que a gravação guarda — o observado, não o derivado. */
  pontos: NormalizedLandmark[];
}

export function processarQuadro(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement | null,
  anterior: Movimento | null,
): Passe {
  const resultado = landmarker.detectForVideo(video, performance.now());
  const pontos = resultado.landmarks[0] ?? [];

  const fatos = fatosDeLandmarks(pontos);
  const movimento = avaliarAgachamento(fatos, anterior ?? {});

  if (canvas) desenharEsqueleto(canvas, video, pontos);

  return { movimento, fatos, pontos };
}

/** Desenha o esqueleto por cima do quadro, no tamanho real do vídeo. */
export function desenharEsqueleto(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  pontos: NormalizedLandmark[],
) {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (pontos.length === 0) return;

  // Desenha os 33 sem filtrar por confiança: numa tela de calibração, ver o
  // modelo inseguro é informação — é assim que se descobre que a perna de trás
  // some ou que o tornozelo se confunde com o chão.
  const lapis = new DrawingUtils(ctx);
  lapis.drawConnectors(pontos, PoseLandmarker.POSE_CONNECTIONS, {
    color: "#22d3ee",
    lineWidth: 3,
  });
  lapis.drawLandmarks(pontos, { color: "#f97316", radius: 3 });
}
