import type { VereditosDaCaptura } from '@elevapro/shared';
import { avaliarConfianca, type EntradaDaConfianca } from '../confiancaDoScan';

function vereditos(sobrescreve: Partial<VereditosDaCaptura> = {}): VereditosDaCaptura {
  return {
    quality_backlit: false,
    quality_low_light: false,
    quality_blown_out: false,
    framing_confirmed: true,
    ...sobrescreve,
  };
}

function entrada(sobrescreve: Partial<EntradaDaConfianca> = {}): EntradaDaConfianca {
  return {
    vereditos: vereditos(),
    troncoRotacionado: false,
    escala: 'assessment',
    ...sobrescreve,
  };
}

describe('o selo de confiança do scan', () => {
  it('não inventa ressalva quando a captura saiu limpa', () => {
    const selo = avaliarConfianca(entrada());

    expect(selo.nivel).toBe('alta');
    expect(selo.motivos).toEqual([]);
  });

  // Enquadramento não confirmado desloca a Escala, e com ela toda largura de
  // uma vez. Luz degrada o que o modelo enxerga sem mexer na régua — por isso
  // um vale por três.
  it('derruba para baixa com enquadramento não confirmado, sozinho', () => {
    const selo = avaliarConfianca(entrada({ vereditos: vereditos({ framing_confirmed: false }) }));

    expect(selo.nivel).toBe('baixa');
    expect(selo.motivos[0]).toContain('deslocadas');
  });

  it('uma ressalva de luz sozinha não derruba o scan', () => {
    const selo = avaliarConfianca(entrada({ vereditos: vereditos({ quality_backlit: true }) }));

    expect(selo.nivel).toBe('media');
    expect(selo.motivos).toHaveLength(1);
  });

  it('três ressalvas leves juntas derrubam', () => {
    const selo = avaliarConfianca(
      entrada({
        vereditos: vereditos({
          quality_backlit: true,
          quality_low_light: true,
          quality_blown_out: true,
        }),
      })
    );

    expect(selo.nivel).toBe('baixa');
  });

  // Tronco rotacionado faz o modelo ler perspectiva como assimetria — é o mesmo
  // achado que o prompt do BFF recebe, e o aluno merece a mesma ressalva.
  it('conta a rotação de tronco como problema grave', () => {
    const selo = avaliarConfianca(entrada({ troncoRotacionado: true }));

    expect(selo.nivel).toBe('baixa');
    expect(selo.motivos[0]).toContain('virado');
  });

  // Tudo é convertido a partir da altura. Altura de cabeça costuma vir
  // arredondada para cima, e o erro entra em toda largura de uma vez.
  it('marca quando a Escala foi declarada em vez de medida', () => {
    const selo = avaliarConfianca(entrada({ escala: 'informed' }));

    expect(selo.nivel).toBe('media');
    expect(selo.motivos[0]).toContain('informada por você');
  });

  // Scan anterior à existência dos vereditos não é scan ruim: é scan sobre o
  // qual não sabemos nada. Afirmar "alta" ali seria inventar procedência.
  it('não trata ausência de sinal como sinal bom', () => {
    const selo = avaliarConfianca(
      entrada({ vereditos: null, troncoRotacionado: null, escala: null })
    );

    expect(selo.nivel).toBe('alta');
    expect(selo.motivos).toEqual([]);
  });

  it('sempre diz o que fazer com a informação', () => {
    for (const caso of [
      entrada(),
      entrada({ vereditos: vereditos({ quality_backlit: true }) }),
      entrada({ troncoRotacionado: true }),
    ]) {
      expect(avaliarConfianca(caso).resumo.length).toBeGreaterThan(0);
    }
  });
});
