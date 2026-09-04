"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * As câmeras que o browser enxerga.
 *
 * Existe para o celular ligado por cabo em modo webcam USB: para o
 * `getUserMedia` ele é só mais um dispositivo na lista, e gravar com a lente
 * que vai para produção fecha metade da diferença entre calibrar aqui e julgar
 * no aparelho.
 */

export interface Camera {
  id: string;
  nome: string;
}

interface Lista {
  cameras: Camera[];
  recarregar: () => Promise<void>;
}

export function useCameras(): Lista {
  const [cameras, setCameras] = useState<Camera[]>([]);

  const recarregar = useCallback(async () => {
    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();

      setCameras(
        dispositivos
          .filter((d) => d.kind === "videoinput")
          .map((d, indice) => ({
            id: d.deviceId,
            // Antes da permissão, o browser esconde o rótulo e devolve string
            // vazia. Sem este fallback a lista vira um seletor de opções em
            // branco, indistinguíveis entre si.
            nome: d.label || `Câmera ${indice + 1}`,
          })),
      );
    } catch {
      setCameras([]);
    }
  }, []);

  useEffect(() => {
    recarregar();

    // Plugar o celular no cabo acontece com a página já aberta, e é justamente
    // o caso que a lista precisa pegar sem recarregar a aba.
    navigator.mediaDevices?.addEventListener("devicechange", recarregar);

    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", recarregar);
    };
  }, [recarregar]);

  return { cameras, recarregar };
}
