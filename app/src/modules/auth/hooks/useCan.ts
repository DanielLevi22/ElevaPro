import type { Action, Subject } from '@elevapro/shared';
import { useAuthStore } from '../store/authStore';

/**
 * A permissão de tela (CASL) da conta logada. Sem as permissões carregadas,
 * nega: o botão aparece depois, nunca antes de saber.
 *
 * @example const podePausar = useCan('create', 'RestPeriod');
 */
export function useCan(action: Action, subject: Subject): boolean {
  return useAuthStore((state) => state.abilities?.can(action, subject) ?? false);
}
