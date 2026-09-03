import { umaRepeticaoAte } from '@elevapro/shared/technique/__tests__/corpo';
import { act, renderHook } from '@testing-library/react-native';
import type { Pose } from '../../../../modules/technique-spike';
import { useAnaliseDeTecnica } from '../hooks/useAnaliseDeTecnica';

/**
 * TRAVA LGPD — nenhuma coordenada do corpo chega a log.
 *
 * Art. 6°, VIII (prevenção). Log é o vazamento que ninguém planeja: um
 * `console.log(pose)` posto para depurar sobrevive ao PR, e a partir dali a
 * posição das articulações de quem treina fica no Logcat, nos crash reports e
 * em qualquer coletor que leia a saída padrão — fora do aparelho, que é
 * exatamente o que a tela de introdução promete que não acontece.
 *
 * A trava aceita log de diagnóstico sem corpo dentro. O que ela recusa é
 * coordenada.
 */

function repeticao(fundo: number): Pose[] {
  return umaRepeticaoAte(fundo).map((pontos, i) => ({
    carimbo: i + 1,
    pontos: pontos.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 1 })),
  }));
}

/** Tudo que a análise imprimiu, junto, para procurar corpo dentro. */
function capturarSaida(rodar: () => void): string {
  const canais = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const escrito: string[] = [];
  const espioes = canais.map((canal) =>
    jest.spyOn(console, canal).mockImplementation((...args: unknown[]) => {
      escrito.push(args.map((a) => JSON.stringify(a)).join(' '));
    })
  );

  try {
    rodar();
  } finally {
    for (const espiao of espioes) espiao.mockRestore();
  }

  return escrito.join('\n');
}

describe('Análise de Técnica — o que chega ao log', () => {
  it('não imprime as coordenadas do corpo', () => {
    const poses = repeticao(0.2);

    const saida = capturarSaida(() => {
      const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));
      for (const pose of poses) {
        act(() => result.current.aoReceberPose(pose));
      }
    });

    // O x do quadril no quadro mais fundo. Se ele aparece na saída, o resto do
    // esqueleto veio junto.
    const quadril = poses[3].pontos[23];
    if (saida.includes(String(quadril.x)) || saida.includes(String(quadril.y))) {
      throw new Error(
        `POSIÇÃO DO CORPO NO LOG: a coordenada do quadril (${quadril.x}, ${quadril.y}) foi impressa e sai do aparelho no Logcat (Art. 6°, VIII)`
      );
    }
  });

  it('não imprime o veredito da repetição', () => {
    const saida = capturarSaida(() => {
      const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));
      for (const pose of repeticao(0.2)) {
        act(() => result.current.aoReceberPose(pose));
      }
    });

    if (/fundo|faltou/i.test(saida)) {
      throw new Error(
        `VEREDITO NO LOG: o julgamento da execução do aluno foi impresso — "${saida.slice(0, 120)}" (Art. 6°, VIII)`
      );
    }
  });
});
