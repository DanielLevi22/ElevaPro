import { avaliarAgachamento, fatosDeLandmarks, type Movimento } from '@elevapro/shared';
import { useCallback, useRef, useState } from 'react';
import type { Pose } from '../../../../modules/technique-spike';

/**
 * Liga a câmera ao julgador: entra um quadro de landmarks, sai o movimento.
 *
 * O julgador mora em `@elevapro/shared` e é chamado daqui sem intermediário —
 * o mesmo código que o painel de calibração roda no browser. Duas
 * implementações da mesma regra divergem em silêncio, e o limiar calibrado lá
 * passaria a valer aqui sem nunca ter sido testado.
 *
 * O que este hook acrescenta é o que só existe ao vivo: a memória entre
 * quadros, o descarte de resultado fora de ordem, e a decisão de quando abrir a
 * boca. **Nada é gravado** — cada quadro substitui o anterior.
 */

/** O que a tela precisa saber para desenhar e para falar. */
export interface AnaliseDeTecnica {
  movimento: Movimento | null;
  /** Os landmarks do último quadro, para o esqueleto. Vazio quando não há corpo. */
  pontos: Pose['pontos'];
  /** A última frase dita. Fica na tela porque quem executa nem sempre ouve. */
  ultimaFala: string | null;
  aoReceberPose: (pose: Pose) => void;
  reiniciar: () => void;
}

export function useAnaliseDeTecnica(falar: (texto: string) => void): AnaliseDeTecnica {
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [pontos, setPontos] = useState<Pose['pontos']>([]);
  const [ultimaFala, setUltimaFala] = useState<string | null>(null);

  // `ref` e não estado: o julgador precisa do quadro anterior dentro do mesmo
  // passe, e esperar o React repintar perderia quadros a 30fps.
  const anterior = useRef<Movimento | null>(null);
  const ultimoCarimbo = useRef(-1);

  const aoReceberPose = useCallback(
    (pose: Pose) => {
      // O MediaPipe em LIVE_STREAM não garante ordem de chegada. Um quadro
      // atrasado reintroduziria uma fase já superada e faria o contador andar
      // para trás.
      if (pose.carimbo <= ultimoCarimbo.current) return;
      ultimoCarimbo.current = pose.carimbo;

      setPontos(pose.pontos);

      const fatos = fatosDeLandmarks(pose.pontos);
      const proximo = avaliarAgachamento(fatos, anterior.current ?? {});
      anterior.current = proximo;
      setMovimento(proximo);

      // `deveFalar` é do julgador, não da tela: é ele que sabe se o aviso é o
      // mesmo já dito. Decidir aqui duplicaria a anti-repetição e as duas
      // cópias divergiriam.
      if (!proximo.deveFalar) return;

      const texto = proximo.veredito?.texto ?? proximo.aviso?.texto;
      if (!texto) return;

      falar(texto);
      setUltimaFala(texto);
    },
    [falar]
  );

  const reiniciar = useCallback(() => {
    anterior.current = null;
    ultimoCarimbo.current = -1;
    setMovimento(null);
    setPontos([]);
    setUltimaFala(null);
  }, []);

  return { movimento, pontos, ultimaFala, aoReceberPose, reiniciar };
}
