"use client";

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useState } from "react";

/**
 * Carrega o PoseLandmarker do MediaPipe no browser.
 *
 * **A versão é a mesma do AAR do Android (`0.10.35`) de propósito**, e o modelo
 * vem da mesma URL que o `body-scan-pose` baixa. O painel calibra o limiar que
 * o aparelho vai usar; calibrar contra outro runtime ou outro modelo produziria
 * um número que não transfere — e é o tipo de divergência que não aparece em
 * teste nenhum, só no aluno.
 */

/** Mesmo `.task` que o módulo nativo do app usa. */
const MODELO_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/**
 * Os binários WASM, fixados na mesma versão do pacote npm.
 *
 * Vêm da CDN em vez de `public/`: são alguns MB que só fazem falta a quem abre
 * esta página, e ela é interna. Auto-hospedar é o passo seguinte se a rede da
 * academia entrar na conta — aqui é ferramenta de mesa.
 */
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

export type EstadoDoLandmarker = "carregando" | "pronto" | "falhou";

interface Carregamento {
  landmarker: PoseLandmarker | null;
  estado: EstadoDoLandmarker;
  erro: string | null;
}

export function usePoseLandmarker(): Carregamento {
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);
  const [estado, setEstado] = useState<EstadoDoLandmarker>("carregando");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let criado: PoseLandmarker | null = null;

    async function carregar() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);

        criado = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELO_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          // Sem máscara de segmentação: ela é metade do custo do passe
          // (`ADR-0022`) e aqui não compra nada — só interessam quadril,
          // joelho e tornozelo.
          outputSegmentationMasks: false,
        });

        // A aba pode ter sido fechada durante o download do modelo. Sem esta
        // guarda, o landmarker fica vivo segurando a GPU sem ninguém para
        // fechá-lo.
        if (!vivo) {
          criado.close();
          return;
        }

        setLandmarker(criado);
        setEstado("pronto");
      } catch (e) {
        if (!vivo) return;
        setErro(e instanceof Error ? e.message : String(e));
        setEstado("falhou");
      }
    }

    carregar();

    return () => {
      vivo = false;
      criado?.close();
    };
  }, []);

  return { landmarker, estado, erro };
}
