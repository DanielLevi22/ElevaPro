import { umaRepeticaoAte } from '@elevapro/shared/technique/__tests__/corpo';
import { act, renderHook } from '@testing-library/react-native';
import type { Pose } from '../../../../modules/technique-spike';
import { useAnaliseDeTecnica } from '../hooks/useAnaliseDeTecnica';

/**
 * TRAVA LGPD — nenhum landmark e nenhum veredito atravessa para o Supabase.
 *
 * Art. 6°, III (necessidade). O que a feature promete ao aluno, no texto que
 * ele leu para autorizar, é que **nada é gravado e nada sai do aparelho**.
 * Persistir a posição das articulações seria coletar o que não é necessário
 * para contar repetição — e transformaria a promessa da tela de introdução em
 * mentira, o que arrasta o consentimento junto (Art. 9°: informado é sobre o
 * texto que a pessoa leu).
 *
 * A trava mira o caminho quente: é ali que "só um log de telemetria" ou "só
 * salvar o total da série" entram sem ninguém notar que atravessaram.
 */

const supabaseGlobal = global as unknown as {
  mockSupabase: { from: jest.Mock; rpc?: jest.Mock };
};

function repeticao(fundo: number): Pose[] {
  return umaRepeticaoAte(fundo).map((pontos, i) => ({
    carimbo: i + 1,
    pontos: pontos.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 1 })),
  }));
}

beforeEach(() => {
  supabaseGlobal.mockSupabase.from.mockClear();
  supabaseGlobal.mockSupabase.rpc?.mockClear();
});

describe('Análise de Técnica — a fronteira do aparelho', () => {
  it('não escreve nada no banco enquanto analisa a série', () => {
    const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));

    for (const pose of [...repeticao(0.2), ...repeticao(-0.3)]) {
      act(() => result.current.aoReceberPose(pose));
    }

    const tabelas = supabaseGlobal.mockSupabase.from.mock.calls.map((c) => c[0]);
    if (tabelas.length > 0) {
      throw new Error(
        `BONECO DE PALITO SAIU DO APARELHO: a análise tocou ${tabelas.join(', ')} — a tela promete ao aluno que nada sai daqui (Art. 6°, III)`
      );
    }
  });

  it('não chama RPC nenhuma com o resultado da repetição', () => {
    const { result } = renderHook(() => useAnaliseDeTecnica(jest.fn()));

    for (const pose of repeticao(0.2)) {
      act(() => result.current.aoReceberPose(pose));
    }

    expect(result.current.movimento?.repeticoes).toBe(1);

    if ((supabaseGlobal.mockSupabase.rpc?.mock.calls.length ?? 0) > 0) {
      throw new Error(
        'VEREDITO SAIU DO APARELHO: a análise chamou uma RPC depois de fechar a repetição (Art. 6°, III)'
      );
    }
  });
});
