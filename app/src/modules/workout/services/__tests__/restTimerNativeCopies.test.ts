import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { restTimerPalette } from '../restTimerPalette';

const APP = join(__dirname, '../../../../..');
const MODULO = join(APP, 'modules/rest-timer-activity');
const ler = (caminho: string) => readFileSync(caminho, 'utf8');

/** "secondaryButtonBorder" vira "rest_secondary_button_border", o nome no Android. */
const nomeAndroid = (nome: string) =>
  `rest_${nome.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`)}`;

function coresDoXml(caminho: string): Record<string, string> {
  const cores = [...ler(caminho).matchAll(/<color name="(\w+)">(#[0-9a-f]{6})<\/color>/g)];
  return Object.fromEntries(cores.map(([, nome, cor]) => [nome, cor]));
}

/**
 * TRAVA — o código nativo não lê TypeScript: a tela bloqueada pinta com cópias
 * da paleta. Se o tema mudar e a cópia não, o lime da tela bloqueada sai de
 * outro tom que o do app. Atualize `palette.json` e os `rest_colors.xml` com o
 * valor que o teste espera.
 */
describe('as cópias nativas do descanso na tela bloqueada', () => {
  const paleta = JSON.parse(ler(join(MODULO, 'palette.json')));

  it.each([
    ['dark', 'escuro', 'values-night'],
    ['light', 'claro', 'values'],
  ] as const)('a paleta %s do iOS e do Android é a do tema', (chave, tema, pasta) => {
    const esperada = restTimerPalette(tema);
    expect(paleta[chave]).toEqual(esperada);
    const android = coresDoXml(join(MODULO, `android/src/main/res/${pasta}/rest_colors.xml`));
    expect(android).toEqual(
      Object.fromEntries(Object.entries(esperada).map(([nome, cor]) => [nomeAndroid(nome), cor]))
    );
  });

  /**
   * O ActivityKit casa o app e a extensão pelo nome do tipo, e os botões rodam
   * no app pelo nome do intent. Cópias diferentes compilam e quebram calado.
   */
  it.each([
    'RestActivityAttributes.swift',
    'RestActivityIntents.swift',
  ])('%s é igual no módulo e na extensão', (arquivo) => {
    expect(ler(join(APP, 'targets/rest-activity', arquivo))).toBe(
      ler(join(MODULO, 'ios', arquivo))
    );
  });
});
