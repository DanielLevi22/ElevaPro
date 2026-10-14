import type { ScheduledNotice } from '@elevapro/shared';
import * as Notifications from 'expo-notifications';
import { scheduleDailyNotices } from '../notificationService';

jest.mock('../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

const scheduled = Notifications.getAllScheduledNotificationsAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const schedule = Notifications.scheduleNotificationAsync as jest.Mock;

const existing = (identifier: string, data: Record<string, unknown>) => ({
  identifier,
  content: { data },
});

const lunch: ScheduledNotice = {
  id: 'notice-2026-10-14-meal-almoco',
  kind: 'meal',
  refId: 'almoco',
  date: '2026-10-14',
  minutes: 13 * 60 + 30,
  title: 'Você tem 1 pendência de hoje',
  body: 'Toque para ver no app.',
};

describe('scheduleDailyNotices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('troca os avisos do dia e o lembrete de refeição antigo, e deixa o relatório', async () => {
    scheduled.mockResolvedValue([
      existing('notice-2026-10-13-meal-almoco', { kind: 'daily-notice' }),
      existing('plano-antigo-almoco-0', { planId: 'plano-antigo', mealId: 'almoco' }),
      existing('weekly-report', { kind: 'weekly-report' }),
    ]);

    await scheduleDailyNotices([lunch], { withActions: false });

    expect(cancel.mock.calls.map(([id]) => id)).toEqual([
      'notice-2026-10-13-meal-almoco',
      'plano-antigo-almoco-0',
    ]);
  });

  it('agenda no dia e na hora locais, e o toque abre a dieta', async () => {
    scheduled.mockResolvedValue([]);

    await scheduleDailyNotices([lunch], { withActions: false });

    const [request] = schedule.mock.calls[0];
    expect(request.identifier).toBe(lunch.id);
    expect(request.trigger.date).toEqual(new Date(2026, 9, 14, 13, 30));
    expect(request.content.data.url).toBe('/(tabs)/nutrition');
    expect(request.content.categoryIdentifier).toBeUndefined();
  });

  it('com detalhes, o aviso da refeição ganha os botões de marcar', async () => {
    scheduled.mockResolvedValue([]);

    await scheduleDailyNotices([lunch], { withActions: true });

    expect(schedule.mock.calls[0][0].content.categoryIdentifier).toBe('notice-meal');
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalled();
  });
});
