import { umaRepeticaoAte } from '@elevapro/shared/technique/__tests__/corpo';
import { act, renderHook } from '@testing-library/react-native';
import type { Pose } from '../../../../../modules/technique-spike';
import { useAnaliseDeTecnica } from '../useAnaliseDeTecnica';

/**
 * O seam sob teste é a ligação entre a câmera e o julgador.
 *
 * A regra do agachamento já tem suíte própria em `shared/` e não se repete
 * aqui. O que se testa é só o que só existe ao vivo: a memória entre quadros, o
 * descarte de resultado fora de ordem, e quando a boca abre.
 */

/** Uma repetição inteira, quadro a quadro, carimbada como o nativo carimba. */
function repeticao(fundo: number, apartirDe = 1): Pose[] {
  return umaRepeticaoAte(fundo).map((pontos, i) => ({
    carimbo: apartirDe + i,
    pontos: pontos.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 1 })),
  }));
}

function alimentar(hook: { current: { aoReceberPose: (p: Pose) => void } }, poses: Pose[]) {
  for (const pose of poses) {
    act(() => hook.current.aoReceberPose(pose));
  }
}

describe('useAnaliseDeTecnica', () => {
  it('conta a repetição e fala o veredito uma vez', () => {
    const falar = jest.fn();
    const { result } = renderHook(() => useAnaliseDeTecnica(falar));

    alimentar(result, repeticao(0.2));

    expect(result.current.movimento?.repeticoes).toBe(1);
    expect(falar).toHaveBeenCalledTimes(1);
    expect(falar).toHaveBeenCalledWith('Fundo.');
    expect(result.current.ultimaFala).toBe('Fundo.');
  });

  it('julga rasa a repetição que não passou da paralela', () => {
    const falar = jest.fn();
    const { result } = renderHook(() => useAnaliseDeTecnica(falar));

    alimentar(result, repeticao(-0.3));

    expect(result.current.movimento?.repeticoes).toBe(1);
    expect(falar).toHaveBeenCalledWith('Faltou.');
  });

  it('guarda a memória entre quadros, somando repetições em vez de recomeçar', () => {
    const falar = jest.fn();
    const { result } = renderHook(() => useAnaliseDeTecnica(falar));

    alimentar(result, repeticao(0.2, 1));
    alimentar(result, repeticao(0.2, 100));

    expect(result.current.movimento?.repeticoes).toBe(2);
  });

  // O MediaPipe em LIVE_STREAM não garante ordem de chegada. Sem o descarte, um
  // quadro atrasado reintroduz uma fase já superada e o contador anda para trás.
  it('descarta quadro que chega fora de ordem', () => {
    const falar = jest.fn();
    const { result } = renderHook(() => useAnaliseDeTecnica(falar));
    const quadros = repeticao(0.2);

    alimentar(result, quadros);
    const depois = result.current.movimento?.repeticoes;

    alimentar(result, [quadros[2], quadros[3]]);

    expect(result.current.movimento?.repeticoes).toBe(depois);
  });

  it('cala no meio da repetição, e só abre a boca quando ela fecha', () => {
    const falar = jest.fn();
    const { result } = renderHook(() => useAnaliseDeTecnica(falar));

    alimentar(result, repeticao(0.2).slice(0, 4));

    expect(falar).not.toHaveBeenCalled();
  });

  it('entrega os landmarks do quadro para o esqueleto', () => {
    const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));

    alimentar(result, repeticao(0.2).slice(0, 1));

    expect(result.current.pontos).toHaveLength(33);
  });

  // Quadro sem corpo não é quadro com corpo parado: aceitar a lista vazia como
  // medida faria o julgador ler zeros como uma pessoa em pé na origem.
  it('não conta repetição em quadro sem corpo nenhum', () => {
    const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));

    alimentar(result, [{ carimbo: 1, pontos: [] }]);

    expect(result.current.movimento?.repeticoes).toBe(0);
  });

  // Avisa UMA vez e cala. Repetir a cada quadro seria trinta frases por segundo
  // — e calar desde o início deixaria a pessoa agachando com o contador parado
  // sem entender por quê.
  it('avisa uma vez que não vê o corpo, e depois se cala', () => {
    const falar = jest.fn();
    const { result } = renderHook(() => useAnaliseDeTecnica(falar));

    alimentar(
      result,
      Array.from({ length: 20 }, (_, i) => ({ carimbo: i + 1, pontos: [] }))
    );

    expect(falar).toHaveBeenCalledTimes(1);
    expect(falar).toHaveBeenCalledWith('Preciso ver seu quadril, seu joelho e seu tornozelo.');
  });

  it('reiniciar zera a contagem, para a próxima série não herdar a anterior', () => {
    const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));

    alimentar(result, repeticao(0.2));
    act(() => result.current.reiniciar());

    expect(result.current.movimento).toBeNull();
    expect(result.current.pontos).toEqual([]);
    expect(result.current.ultimaFala).toBeNull();
  });
});
