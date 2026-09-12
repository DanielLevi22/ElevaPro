import { coresDoTema } from '@/shared/design';
import { colors } from '../colors';

/**
 * Este arquivo trocou de lado.
 *
 * Antes ele travava a paleta "Energy Gradient" e falhava se qualquer cor do
 * Claude Design aparecesse — o comentário no topo registrava que a troca para
 * o lime, feita em `ec2df72`, tinha sido revertida de propósito. A ADR-0025
 * reverte a reversão e explica por quê.
 *
 * O que ele guarda agora é o inverso: que `constants/colors` não tem cor
 * própria nenhuma, e é só um reempacotamento de `@/shared/design`. Enquanto
 * isso valer, as duas não podem divergir por mais que este módulo demore a
 * morrer.
 */

/** Hexadecimais da paleta anterior. Nenhum deles pode reaparecer. */
const PALETA_CORAL = ['#ff6b35', '#ff2e63', '#ff4d5a', '#00d9ff', '#9d4edd', '#0a0a0a'];

const achatarCores = (no: unknown): string[] => {
  if (typeof no === 'string') return no.startsWith('#') ? [no.toLowerCase()] : [];
  if (Array.isArray(no)) return no.flatMap(achatarCores);
  if (no && typeof no === 'object') return Object.values(no).flatMap(achatarCores);
  return [];
};

describe('ponte de cor para o design system', () => {
  const escuro = coresDoTema('escuro');

  it('não tem nenhuma cor da paleta coral anterior', () => {
    const usadas = new Set(achatarCores(colors));
    expect(PALETA_CORAL.filter((hex) => usadas.has(hex))).toEqual([]);
  });

  it('não inventa cor: tudo que sai daqui existe no tema escuro do design', () => {
    const doDesign = new Set(Object.values(escuro).map((cor) => cor.toLowerCase()));
    const daPonte = new Set(achatarCores(colors));
    expect([...daPonte].filter((cor) => !doDesign.has(cor))).toEqual([]);
  });

  it('serve o lime do design como primária', () => {
    expect(colors.primary.solid).toBe(escuro.primary);
    expect(colors.primary.start).toBe(escuro.primary);
  });

  it('mantém os gradientes como par, que é o que o LinearGradient exige', () => {
    expect(colors.gradients.primary).toEqual([escuro.primary, escuro.accent]);
    expect(colors.gradients.primaryReverse).toEqual([escuro.accent, escuro.primary]);
  });
});
