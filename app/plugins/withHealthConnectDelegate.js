const { withMainActivity } = require('@expo/config-plugins');

const IMPORT = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CHAMADA = '    HealthConnectPermissionDelegate.setPermissionDelegate(this)';

/**
 * Registra o delegate de permissão do Health Connect no `MainActivity`.
 *
 * `HealthConnectPermissionDelegate.requestPermission` é um `lateinit` que só é
 * inicializado por `setPermissionDelegate(activity)` — e **nada dentro da
 * biblioteca chama isso**. O `app.plugin.js` do `react-native-health-connect`
 * só acrescenta um intent-filter ao manifest; o registro é responsabilidade do
 * app.
 *
 * Sem ele, pedir permissão derruba o processo:
 *
 *     kotlin.UninitializedPropertyAccessException:
 *       lateinit property requestPermission has not been initialized
 *
 * O registro precisa acontecer em `onCreate`, porque
 * `registerForActivityResult` só pode ser chamado antes de a Activity ficar
 * `STARTED` — depois disso o próprio Android lança.
 *
 * Vive como plugin, e não como edição direta do `MainActivity.kt`, porque
 * `app/android` é gerado e ignorado pelo git: uma edição à mão se perderia no
 * próximo `prebuild` e nunca chegaria a um build do EAS.
 */
const withHealthConnectDelegate = (config) =>
  withMainActivity(config, (config) => {
    let conteudo = config.modResults.contents;

    if (conteudo.includes('HealthConnectPermissionDelegate')) {
      return config;
    }

    if (config.modResults.language !== 'kt') {
      throw new Error(
        `withHealthConnectDelegate: MainActivity em ${config.modResults.language}, ` +
          'mas o plugin só sabe editar Kotlin. Sem o registro, pedir permissão ' +
          'do Health Connect derruba o app.'
      );
    }

    conteudo = conteudo.replace(
      'import com.facebook.react.ReactActivity',
      `${IMPORT}\nimport com.facebook.react.ReactActivity`
    );

    // Depois do `super.onCreate`, que é onde a Activity já existe e ainda não
    // chegou a STARTED.
    const ancora = '    super.onCreate(null)';
    if (!conteudo.includes(ancora)) {
      throw new Error(
        'withHealthConnectDelegate: não encontrei `super.onCreate(null)` no ' +
          'MainActivity. O template do Expo mudou — ajuste a âncora antes de ' +
          'confiar neste plugin.'
      );
    }

    conteudo = conteudo.replace(ancora, `${ancora}\n${CHAMADA}`);

    config.modResults.contents = conteudo;
    return config;
  });

module.exports = withHealthConnectDelegate;
