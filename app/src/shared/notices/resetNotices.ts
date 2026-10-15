import { DEFAULT_PREFERENCES } from '@elevapro/shared';
import { clearAllNotices } from '@/services/notificationService';
import { useLightWeekStore } from '@/shared/lightWeek';
import { updateTodayWidget } from '@/shared/widget';
import { useNoticeChoicesStore } from './noticeChoicesStore';
import { useNoticePreferencesStore } from './noticePreferencesStore';

/**
 * Ao sair da conta: os avisos agendados e os que já tocaram, as respostas, as
 * preferências, a semana leve e o widget eram da pessoa que saiu. No aparelho
 * compartilhado, quem entra depois não pode receber o almoço do outro na tela
 * bloqueada (Art. 6°, VII).
 *
 * @example await resetNotices();
 */
export async function resetNotices(): Promise<void> {
  useNoticeChoicesStore.getState().reset();
  useNoticePreferencesStore.getState().update(DEFAULT_PREFERENCES);
  useLightWeekStore.setState({ until: null });
  await Promise.all([clearAllNotices(), updateTodayWidget(null)]);
}
