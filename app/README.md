# meu-personal-app

## Emulador Android e o banco local

Dentro do emulador, `localhost` é o **próprio emulador** — não a sua máquina. Um
`app/.env.development` apontando para `http://localhost:47321` faz o login
falhar, porque não existe Supabase nenhum naquele endereço.

**O `env:sync` já resolve isso.** Ele traduz endereço local para `10.0.2.2`, o
alias do loopback do host, ao gerar o arquivo do app — e mantém `127.0.0.1` no
do web, que roda na própria máquina. O mesmo valor significa máquinas diferentes
nos dois lados, e o script sabe disso.

```bash
npm run env:sync
```

Se o `app/.env.development` estiver com `localhost`, ele é anterior a essa
tradução: rode o comando acima e reinicie o Metro.

### Aparelho físico por USB

Aí `10.0.2.2` não vale — o alias é do emulador. Para um celular ligado por cabo,
o caminho é o túnel:

```bash
npm run android:tunnel
```

Isso mapeia as portas do host (Supabase em `47321`, BFF em `3000`) para dentro
do aparelho. **Refaça depois de reiniciar o aparelho ou o servidor adb** — o
`adb reverse` não sobrevive a nenhum dos dois.

## Build Android no Windows

Desde o Expo SDK 58 (#397), o `react-native-gesture-handler` 3 gera arquivos
C++ com caminhos acima de 260 caracteres. O `ninja` 1.10, que vem com o CMake
3.22 do Android SDK, falha mesmo com `LongPathsEnabled` ligado no Windows:

```
ninja: error: Stat(...RNGestureHandlerDetectorShadowNode.cpp.o): Filename longer than 260 characters
```

O CMake 3.31.6 traz o `ninja` 1.12, que aceita esses caminhos. Instale uma vez:

```bash
# com barra: no .bat o `;` de "cmake;3.31.6" quebra o argumento
sdkmanager "cmake/3.31.6"
```

E aponte o build para ele em `app/android/local.properties`, com barras normais:

```properties
sdk.dir=C:/Users/<você>/AppData/Local/Android/Sdk
cmake.dir=C:/Users/<você>/AppData/Local/Android/Sdk/cmake/3.31.6
```

**O `npx expo prebuild --clean` apaga esse arquivo**: recrie a linha depois de
cada prebuild. No Linux (pipeline e EAS) nada disso é preciso.

### O dev client pede "dispositivos próximos"

No Android 17, o build de desenvolvimento pede a permissão
`ACCESS_LOCAL_NETWORK`, que o sistema mostra como "encontrar e conectar a
dispositivos próximos". É o `expo-dev-launcher` procurando o Metro na rede
local. Ela só existe no build de debug e não vai para a loja. Pode permitir.

### Mudou um `_layout` e o app não viu

No SDK 58, as rotas carregam em bundles separados, sob demanda. Uma mudança em
`_layout` pode continuar invisível até o Metro reiniciar sem cache:

```bash
npx expo start --dev-client --clear
```

## Build de release e o R8

Desde o SDK 58, o template do Expo liga o **R8** no release
(`android.enableMinifyInReleaseBuilds=true` no `gradle.properties` gerado). O
R8 remove e renomeia classes que ninguém chama diretamente. O debug não
minifica, e por isso um release pode fechar ao abrir enquanto o debug
funciona.

**Já aconteceu (#426).** O APK de release fechava antes do JavaScript:

```
Unable to get provider androidx.startup.InitializationProvider
Caused by: Failed to create an instance of class androidx.work.impl.WorkDatabase.canonicalName
```

O WorkManager 2.8.1 vem pelo `react-native-android-widget`, com o Room 2.5,
que acha por reflexão a classe gerada do banco (`WorkDatabase_Impl`). O R8 a
apagava. As regras de keep do Room resolveram.

**Regra do R8 vai no `extraProguardRules` do `expo-build-properties`**, no
`app.json`, nunca no `android/app/proguard-rules.pro`: o `android/` é gerado,
e o `prebuild` apagaria a regra.

Para ver o crash de um release:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb logcat -c && adb shell monkey -p com.elevapro.app -c android.intent.category.LAUNCHER 1
adb logcat -d -s AndroidRuntime:E
```

## Lockfile e a pipeline

A pipeline instala com `npm ci` no Node 22, ou seja, npm 10. O npm 11 local
aceita um `package-lock.json` que o npm 10 recusa (`Missing: ... from lock
file`). Depois de mexer em dependência do app, refaça o lock com a versão da
pipeline e confira:

```bash
npx npm@10 install
npx npm@10 ci --dry-run --ignore-scripts
```

Se o lock antigo prender uma versão e o npm acusar um conflito falso
(`ERESOLVE` com peer opcional), resolva do zero numa pasta à parte, só com o
`package.json`, e traga o lock gerado.

Versão de React, React Native, Jest e libs nativas não sobe pelo Dependabot.
Ela sobe com o SDK do Expo ([ADR-0046](../docs/adr/0046-as-versoes-do-app-seguem-o-sdk-do-expo.md)).

## Quando o login falha com "invalid number of segments"

O erro vem do GoTrue e quer dizer que o `apikey` enviado não é um JWT — quase
sempre porque ele chegou **vazio**, e string vazia não tem três segmentos.

A causa conhecida: `web/.env.local` e `app/.env.development` são **gerados** pelo
`scripts/sync-env.js`, que lê nomes **sem prefixo** na fonte (`SUPABASE_ANON_KEY`).
Uma fonte que já traga os nomes prefixados (`EXPO_PUBLIC_...`, `NEXT_PUBLIC_...`)
não casa com o mapeamento, e o script gera um arquivo só com o cabeçalho.

Confira antes de procurar em outro lugar:

```bash
npm run env:sync            # regenera a partir de .env.development
grep -c = web/.env.local    # zero significa arquivo vazio
```

Depois reinicie o servidor: `NEXT_PUBLIC_*` é lida na subida, e build de
produção precisa ser refeito.
