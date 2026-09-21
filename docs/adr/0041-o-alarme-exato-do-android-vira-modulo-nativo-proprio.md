# O alarme exato do Android vira módulo nativo próprio

Notificação local no Android 12+ (API 31) só dispara na hora exata se o app tiver a permissão especial "Alarmes e lembretes" concedida em runtime — declarar `SCHEDULE_EXACT_ALARM` no manifest não basta. O `expo-notifications` já trata isso internamente (recua para alarme inexato quando falta, em vez de falhar), mas não expõe ao JS nenhuma forma de checar ou pedir essa permissão. O Eleva Pro resolve isso com um módulo Expo nativo próprio (`app/modules/exact-alarm-permission`), Android-only, em vez de esperar que a lib upstream adicione o suporte ou de aceitar o atraso como limitação de plataforma.

**Status:** accepted. Corrige o bug relatado na issue #336 (lembrete de refeição/treino chegando bem depois do horário marcado).

## Por que módulo nativo, e não as alternativas

- **Aceitar como limitação de plataforma** foi descartado: o sintoma (lembrete atrasado, não ausente) tem causa raiz identificável e corrigível — `AlarmManager.canScheduleExactAlarms()` existe desde a API 31, só não está exposto pelo `expo-notifications`.
- **Esperar a lib upstream** também foi descartado: o `expo-notifications` já tem o próprio fallback documentado no código nativo dele (`ExpoSchedulingDelegate.kt`), e não há indicação de que vá expor essa checagem — não é uma lacuna que a lib trata como bug dela.
- Sobrou escrever o módulo: duas funções (`isGranted`, `openSettings`) que chamam `AlarmManager.canScheduleExactAlarms()` e o intent `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`. Nasce como módulo local (`--local`, não publicado), porque o uso é interno a este app.

## Consequências

- O app mobile ganha uma dependência de código Kotlin fora do controle do `expo-notifications` — quem tocar em notificação precisa saber que essa peça existe e por quê.
- Mudança neste módulo exige rebuild nativo (`npx expo run:android` ou dev client novo); Fast Refresh não alcança. `requireOptionalNativeModule` cobre o caso de quem ainda não rebuildou (ou está no Expo Go, que nunca vai ter módulo nativo customizado): o app trata como permissão concedida em vez de derrubar.
- iOS e web não têm esse conceito — o módulo já nasce Android-only (`expo-module.config.json`), com stub seguro (`isGranted` sempre `true`) nos outros dois, sem `if (Platform.OS === 'android')` espalhado pelos call sites.
