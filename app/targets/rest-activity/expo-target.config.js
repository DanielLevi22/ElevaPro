const palette = require('../../modules/rest-timer-activity/palette.json');

/**
 * As cores vêm da cópia da paleta que um teste trava contra os tokens do tema
 * (`restTimerPalette`). Cada uma vira um colorset com a versão clara e a escura.
 */
const colors = Object.fromEntries(
  Object.keys(palette.light).map((name) => [
    name,
    { color: palette.light[name], darkColor: palette.dark[name] },
  ])
);

/**
 * A extensão que desenha o descanso na tela bloqueada e na Dynamic Island.
 * 16.2 é o primeiro iOS com `ActivityContent`; os botões pedem 17.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'widget',
  name: 'RestActivity',
  displayName: 'Descanso',
  deploymentTarget: '16.2',
  colors,
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
};
