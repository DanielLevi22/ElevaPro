import ExactAlarmPermissionModule from './src/ExactAlarmPermissionModule';

/**
 * A permissão que falta ao agendamento local não disparar atrasado.
 *
 * Ver o comentário do módulo nativo (`ExactAlarmPermissionModule.kt`) para o
 * porquê: sem ela, Android 12+ recua o `expo-notifications` para alarme
 * inexato, que o Doze atrasa — a causa raiz do bug relatado na #336.
 *
 * @example
 * if (!isExactAlarmGranted()) openExactAlarmSettings();
 */
export function isExactAlarmGranted(): boolean {
  return ExactAlarmPermissionModule.isGranted();
}

/** Abre a tela do sistema onde o usuário concede "Alarmes e lembretes". Sem efeito fora do Android 12+. */
export function openExactAlarmSettings(): void {
  ExactAlarmPermissionModule.openSettings();
}
