import * as Notifications from 'expo-notifications';
import { routeOfNotification, scheduleWeeklyReportNotification } from '../notificationService';

jest.mock('../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn().mockReturnValue(true),
  openExactAlarmSettings: jest.fn(),
}));

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const permissions = Notifications.getPermissionsAsync as jest.Mock;

describe('o aviso de domingo do relatório da semana (R0)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('agenda todo domingo às 18h e abre o relatório', async () => {
    expect(await scheduleWeeklyReportNotification()).toBe(true);
    const { trigger, content } = schedule.mock.calls[0][0];
    expect(trigger).toMatchObject({ weekday: 1, hour: 18, minute: 0 });
    expect(routeOfNotification(content.data)).toBe('/checkin/report');
  });

  it('sem permissão, não agenda nem pede: a tela inicial não é lugar de pedir', async () => {
    permissions.mockResolvedValueOnce({ status: 'denied' });
    expect(await scheduleWeeklyReportNotification()).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
  });

  /**
   * TRAVA — o aviso aparece na tela bloqueada: treinos, recordes, peso e meta da
   * semana são dado de saúde (LGPD Art. 11) e não podem estar no texto.
   */
  it('não leva dado de saúde no texto que aparece na tela bloqueada', async () => {
    await scheduleWeeklyReportNotification();
    const { title, body } = schedule.mock.calls[0][0].content;
    if (/\d|kcal|kg|peso|meta|recorde|treino/i.test(`${title} ${body}`)) {
      throw new Error(`DADO DE SAÚDE NA TELA BLOQUEADA: "${title} — ${body}"`);
    }
  });

  it('o toque só abre caminho interno, nunca endereço de fora', () => {
    expect(routeOfNotification({ url: 'https://exemplo.com' })).toBeNull();
    expect(routeOfNotification({ url: '//exemplo.com' })).toBeNull();
    expect(routeOfNotification(undefined)).toBeNull();
  });
});
