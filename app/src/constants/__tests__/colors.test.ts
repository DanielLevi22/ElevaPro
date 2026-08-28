import { colors, tailwindColors } from '../colors';

/**
 * A paleta do mobile é a "Energy Gradient" — laranja → rosa, azul elétrico e
 * roxo. Ela é **deliberadamente diferente** da paleta do web, que usa o lime
 * `#CCFF00` do Claude Design.
 *
 * Em 2026-08-28 o commit `ec2df72` trocou este arquivo pelo lime, alinhando o
 * mobile ao web. A decisão foi revertida: as duas plataformas mantêm paletas
 * próprias. Este teste existe para que a troca não volte em silêncio — sem
 * ele, nada no repositório distingue "mudei a cor de propósito" de "colei a
 * paleta errada".
 */

/** Hexadecimais da paleta do web. Nenhum deles pode aparecer no mobile. */
const WEB_PALETTE = ['#CCFF00', '#00F0FF', '#FF0099'];

const collectHexValues = (node: unknown): string[] => {
  if (typeof node === 'string') return node.startsWith('#') ? [node.toUpperCase()] : [];
  if (Array.isArray(node)) return node.flatMap(collectHexValues);
  if (node && typeof node === 'object') return Object.values(node).flatMap(collectHexValues);
  return [];
};

describe('paleta Energy Gradient do mobile', () => {
  it('mantém o laranja → rosa da primária', () => {
    expect(colors.primary.start).toBe('#FF6B35');
    expect(colors.primary.end).toBe('#FF2E63');
    expect(colors.primary.solid).toBe('#FF4D5A');
  });

  it('mantém o azul elétrico e o roxo', () => {
    expect(colors.secondary.main).toBe('#00D9FF');
    expect(colors.accent.main).toBe('#9D4EDD');
  });

  it('mantém os pretos profundos do dark mode', () => {
    expect(colors.background.primary).toBe('#0A0A0A');
    expect(colors.background.surface).toBe('#242424');
  });

  it('expõe os gradientes como tupla — LinearGradient do expo exige tuple', () => {
    expect(colors.gradients.primary).toEqual(['#FF6B35', '#FF2E63']);
    expect(colors.gradients.primaryReverse).toEqual(['#FF2E63', '#FF6B35']);
  });

  it('não usa nenhuma cor da paleta do web', () => {
    const used = new Set([...collectHexValues(colors), ...collectHexValues(tailwindColors)]);
    expect(WEB_PALETTE.filter((hex) => used.has(hex))).toEqual([]);
  });

  it('serve ao Tailwind o mesmo primário que o resto do app usa', () => {
    expect(tailwindColors.primary.DEFAULT).toBe(colors.primary.solid);
    expect(tailwindColors.secondary.DEFAULT).toBe(colors.secondary.main);
    expect(tailwindColors.accent.DEFAULT).toBe(colors.accent.main);
    expect(tailwindColors.background.DEFAULT).toBe(colors.background.primary);
  });
});
