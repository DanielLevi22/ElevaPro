const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

/**
 * Declara a Activity que o Android 14+ abre para explicar o uso das permissões
 * de saúde.
 *
 * A partir do Android 14 o Health Connect passou a fazer parte do sistema, e o
 * `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` — que o plugin da
 * biblioteca já adiciona — deixou de bastar. Sem este `activity-alias`, o
 * sistema **não abre o diálogo de permissão**: a chamada volta com a lista
 * vazia, sem erro e sem nada na tela, e o app conclui que o usuário recusou.
 *
 * O `android:permission` é exigido pelo sistema: sem ele o alias é ignorado.
 */
const withHealthPermissionsUsageActivity = (config) =>
  withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];

    application['activity-alias'] = application['activity-alias'] ?? [];

    const jaExiste = application['activity-alias'].some(
      (alias) => alias.$?.['android:name'] === 'ViewPermissionUsageActivity'
    );
    if (jaExiste) return config;

    application['activity-alias'].push({
      $: {
        'android:name': 'ViewPermissionUsageActivity',
        'android:exported': 'true',
        'android:targetActivity': '.MainActivity',
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
          category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
        },
      ],
    });

    return config;
  });

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

/**
 * Os dois lados do Health Connect no Android: o registro do delegate no
 * `MainActivity` e a declaração que o sistema exige a partir do 14. Faltando
 * qualquer um, pedir permissão falha — um derruba o app, o outro devolve lista
 * vazia em silêncio.
 */
module.exports = (config) => withHealthPermissionsUsageActivity(withHealthConnectDelegate(config));
