import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useNoticePreferencesStore } from './noticePreferencesStore';
import { refreshDailyNotices } from './refreshDailyNotices';

/**
 * Mantém os avisos do dia em dia: agenda ao abrir o app, ao voltar para ele e
 * quando as preferências mudam. Nulo desliga, para quem não é aluno ou para o
 * especialista vendo como o aluno.
 *
 * @example useDailyNotices(isStudent ? user.id : null);
 */
export function useDailyNotices(studentId: string | null): void {
  const preferences = useNoticePreferencesStore();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `preferences` não é lido no efeito; mudar é o próprio pedido para agendar de novo.
  useEffect(() => {
    if (!studentId) return;
    void refreshDailyNotices(studentId);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshDailyNotices(studentId);
    });
    return () => subscription.remove();
  }, [studentId, preferences]);
}
