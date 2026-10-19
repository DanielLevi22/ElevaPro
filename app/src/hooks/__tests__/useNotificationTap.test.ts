import { renderHook, waitFor } from '@testing-library/react-native';
import { useNotificationTap } from '../useNotificationTap';

const mockPush = jest.fn();
const mockHandle = jest.fn();
const mockRespond = jest.fn();
let mockResponse: unknown = null;

jest.mock('expo-notifications', () => ({
  ...jest.requireActual('expo-notifications'),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  useLastNotificationResponse: () => mockResponse,
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/shared/notices', () => ({
  ...jest.requireActual('@/shared/notices/noticeActions'),
  handleNoticeAction: (...args: unknown[]) => mockHandle(...args),
  useNoticeChoicesStore: { getState: () => ({ respond: mockRespond }) },
}));
jest.mock('../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

const DEFAULT = 'expo.modules.notifications.actions.DEFAULT';
const responseOf = (data: Record<string, unknown>, actionIdentifier = DEFAULT) => ({
  actionIdentifier,
  notification: { date: 1, request: { identifier: 'n-1', content: { data } } },
});
const notice = { kind: 'daily-notice', noticeKind: 'meal', refId: 'almoco', date: '2026-10-14' };

describe('useNotificationTap', () => {
  beforeEach(() => jest.clearAllMocks());

  it('o toque no aviso do relatório abre a tela dele', async () => {
    mockResponse = responseOf({ kind: 'weekly-report', url: '/checkin/report' });
    await renderHook(() => useNotificationTap('aluno'));
    expect(mockPush).toHaveBeenCalledWith('/checkin/report');
  });

  it('o botão do aviso do dia vira a ação, e o toque conta como resposta (E6)', async () => {
    mockHandle.mockResolvedValue('/(tabs)/nutrition');
    mockResponse = responseOf({ ...notice, url: '/(tabs)/nutrition' }, 'meal-other');

    await renderHook(() => useNotificationTap('aluno'));

    expect(mockRespond).toHaveBeenCalledWith('n-1');
    expect(mockHandle).toHaveBeenCalledWith('aluno', 'meal-other', {
      noticeKind: 'meal',
      refId: 'almoco',
      date: '2026-10-14',
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(tabs)/nutrition'));
  });

  it('antes da sessão, nada abre: o guarda de login levaria a pessoa embora', async () => {
    mockResponse = responseOf({ kind: 'weekly-report', url: '/checkin/report' });
    await renderHook(() => useNotificationTap(null));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('URL de fora não é aberta pelo aviso', async () => {
    mockResponse = responseOf({ url: 'https://phishing.example' });
    await renderHook(() => useNotificationTap('aluno'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
