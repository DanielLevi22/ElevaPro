import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { scheduleMealNotifications } from '../notificationService';

jest.mock('../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

const scheduled = Notifications.getAllScheduledNotificationsAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

const scheduledNotification = (identifier: string, data: Record<string, unknown>) => ({
  identifier,
  content: { data },
});

/**
 * Regressão (#376): cada ajuste aprovado no check-in cria uma versão nova da
 * dieta, com outro id. O agendamento cancelava só os lembretes do plano novo, e
 * os da versão anterior seguiam tocando: cada refeição avisava duas vezes.
 */
describe('os lembretes de refeição ao trocar de versão da dieta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
  });

  it('cancela os lembretes da versão anterior da dieta', async () => {
    scheduled.mockResolvedValue([
      scheduledNotification('plano-antigo-almoco', { planId: 'plano-antigo', mealId: 'almoco' }),
    ]);

    await scheduleMealNotifications('plano-novo', [
      { mealId: 'almoco', mealName: 'Almoço', mealTime: '12:30', dayOfWeek: 1 },
    ]);

    const cancelled = cancel.mock.calls.map(([id]) => id);
    if (!cancelled.includes('plano-antigo-almoco')) {
      throw new Error('LEMBRETE EM DOBRO: o almoço da versão anterior da dieta seguiu agendado');
    }
  });

  it('não cancela o lembrete de treino, que não é da dieta', async () => {
    scheduled.mockResolvedValue([scheduledNotification('treino-segunda', { kind: 'workout' })]);

    await scheduleMealNotifications('plano-novo', []);

    expect(cancel).not.toHaveBeenCalledWith('treino-segunda');
  });
});
