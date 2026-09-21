import { NativeModule, requireOptionalNativeModule } from 'expo';

/** Sem eventos — o módulo é só duas funções síncronas. */
declare class ExactAlarmPermissionModule extends NativeModule<Record<never, never>> {
  /** `false` só é possível em Android 12+ sem "Alarmes e lembretes" concedido. */
  isGranted(): boolean;
  /** Abre a tela do sistema onde o usuário concede a permissão. */
  openSettings(): void;
}

const native = requireOptionalNativeModule<ExactAlarmPermissionModule>('ExactAlarmPermission');

/**
 * `native` é `null` antes do primeiro rebuild nativo do dev client — o módulo
 * é código Kotlin, Metro/Fast Refresh não alcança — e sempre no Expo Go, que
 * não carrega módulo nativo customizado nenhum. Nos dois casos, o app não
 * pode cair por causa disto: trata como permissão concedida, o mesmo default
 * seguro dos stubs de iOS e web.
 */
export default {
  isGranted(): boolean {
    return native?.isGranted() ?? true;
  },
  openSettings(): void {
    native?.openSettings();
  },
};
