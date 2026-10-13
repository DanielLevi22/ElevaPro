import * as Notifications from 'expo-notifications';
import { hasDailyLogReminder, scheduleDailyLogReminder } from '../notificationService';

jest.mock('../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn().mockReturnValue(true),
  openExactAlarmSettings: jest.fn(),
}));

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const scheduled = Notifications.getAllScheduledNotificationsAsync as jest.Mock;

describe('o lembrete das 20h para registrar o dia (A5b)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('agenda todo dia às 20h', async () => {
    expect(await scheduleDailyLogReminder()).toBe(true);
    expect(schedule.mock.calls[0][0].trigger).toMatchObject({ hour: 20, minute: 0 });
  });

  /**
   * TRAVA — o aviso aparece na tela bloqueada: refeição, caloria e peso são
   * dado de saúde (LGPD Art. 11) e não podem estar no texto.
   */
  it('não leva dado de saúde no texto que aparece na tela bloqueada', async () => {
    await scheduleDailyLogReminder();
    const { title, body } = schedule.mock.calls[0][0].content;
    if (/\d|kcal|kg|peso|meta/i.test(`${title} ${body}`)) {
      throw new Error(`DADO DE SAÚDE NA TELA BLOQUEADA: "${title} — ${body}"`);
    }
  });

  it('sabe se está ligado pelo agendamento', async () => {
    scheduled.mockResolvedValueOnce([{ identifier: 'daily-log-reminder', content: { data: {} } }]);
    expect(await hasDailyLogReminder()).toBe(true);
  });
});
