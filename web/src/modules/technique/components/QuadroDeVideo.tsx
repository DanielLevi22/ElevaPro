"use client";

import { useCallback, useRef } from "react";

/**
 * O quadro de vídeo com o esqueleto por cima.
 *
 * Proporção 16:9 fixa e tela cheia no contêiner, não no `<video>`: pedir tela
 * cheia ao elemento de vídeo deixa o canvas do esqueleto para trás, e o que vai
 * para a tela inteira é o vídeo pelado — justamente sem a informação que a
 * pessoa quer ver de perto.
 */

interface QuadroDeVideoProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Controles nativos: úteis para arquivo, sem sentido para câmera ao vivo. */
  controles?: boolean;
}

export function QuadroDeVideo({ videoRef, canvasRef, controles = false }: QuadroDeVideoProps) {
  const molduraRef = useRef<HTMLDivElement>(null);

  const telaCheia = useCallback(() => {
    const moldura = molduraRef.current;
    if (!moldura) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    moldura.requestFullscreen?.();
  }, []);

  return (
    <div
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      ref={molduraRef}
    >
      {/* `object-contain` e nao `cover`: cortar o video para preencher a moldura
          tiraria justamente os pes ou a cabeca, que sao o que o julgador precisa. */}
      <video
        className="absolute inset-0 h-full w-full object-contain"
        controls={controles}
        muted
        playsInline
        ref={videoRef}
      />
      <canvas
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        ref={canvasRef}
      />

      <button
        aria-label="Alternar tela cheia"
        className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
        onClick={telaCheia}
        type="button"
      >
        Tela cheia
      </button>
    </div>
  );
}
