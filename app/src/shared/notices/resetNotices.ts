import { scheduleDailyNotices } from '@/services/notificationService';
import { updateTodayWidget } from '@/shared/widget';
import { useNoticeChoicesStore } from './noticeChoicesStore';

/**
 * Ao sair da conta: os avisos agendados, as respostas e o widget eram da
 * pessoa que saiu. No aparelho compartilhado, o próximo não pode receber o
 * almoço do outro na tela bloqueada (Art. 6°, VII).
 *
 * @example await resetNotices();
 */
export async function resetNotices(): Promise<void> {
  useNoticeChoicesStore.getState().reset();
  await Promise.all([scheduleDailyNotices([], { withActions: false }), updateTodayWidget(null)]);
}
