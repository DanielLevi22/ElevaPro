import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { restTimerPalette } from '../restTimerPalette';

const APP = join(__dirname, '../../../../..');
const MODULE_DIR = join(APP, 'modules/rest-timer-activity');
const read = (path: string) => readFileSync(path, 'utf8');

/** "secondaryButtonBorder" vira "rest_secondary_button_border", o nome no Android. */
const androidName = (name: string) =>
  `rest_${name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`;

function colorsFromXml(path: string): Record<string, string> {
  const colors = [...read(path).matchAll(/<color name="(\w+)">(#[0-9a-f]{6})<\/color>/g)];
  return Object.fromEntries(colors.map(([, name, color]) => [name, color]));
}

/**
 * TRAVA — o código nativo não lê TypeScript: a tela bloqueada pinta com cópias
 * da paleta. Se o tema mudar e a cópia não, o lime da tela bloqueada sai de
 * outro tom que o do app. Atualize `palette.json` e os `rest_colors.xml` com o
 * valor que o teste espera.
 */
describe('as cópias nativas do descanso na tela bloqueada', () => {
  const palette = JSON.parse(read(join(MODULE_DIR, 'palette.json')));

  it.each([
    ['dark', 'escuro', 'values-night'],
    ['light', 'claro', 'values'],
  ] as const)('a paleta %s do iOS e do Android é a do tema', (key, theme, folder) => {
    const expected = restTimerPalette(theme);
    expect(palette[key]).toEqual(expected);
    const android = colorsFromXml(
      join(MODULE_DIR, `android/src/main/res/${folder}/rest_colors.xml`)
    );
    expect(android).toEqual(
      Object.fromEntries(
        Object.entries(expected).map(([name, color]) => [androidName(name), color])
      )
    );
  });

  /**
   * O ActivityKit casa o app e a extensão pelo nome do tipo, e os botões rodam
   * no app pelo nome do intent. Cópias diferentes compilam e quebram calado.
   */
  it.each([
    'RestActivityAttributes.swift',
    'RestActivityIntents.swift',
  ])('%s é igual no módulo e na extensão', (file) => {
    expect(read(join(APP, 'targets/rest-activity', file))).toBe(
      read(join(MODULE_DIR, 'ios', file))
    );
  });
});
