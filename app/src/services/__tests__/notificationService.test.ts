import { Platform } from 'react-native';
import { showConfirm } from '@/components/ui/appAlert';
import {
  isExactAlarmGranted,
  openExactAlarmSettings,
} from '../../../modules/exact-alarm-permission';
import { requestNotificationPermissions } from '../notificationService';

jest.mock('../../../modules/exact-alarm-permission', () => ({
  isExactAlarmGranted: jest.fn(),
  openExactAlarmSettings: jest.fn(),
}));

jest.mock('@/components/ui/appAlert', () => ({
  showConfirm: jest.fn(),
}));

const isExactAlarmGrantedMock = isExactAlarmGranted as jest.Mock;
const showConfirmMock = showConfirm as jest.Mock;

describe('requestNotificationPermissions — permissão de alarme exato (#336)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Android 12+ sem "Alarmes e lembretes" recua o expo-notifications para
  // alarme inexato, que o Doze atrasa — a causa raiz do bug relatado na #336.
  it('pede a permissão de alarme exato quando o Android não concedeu', async () => {
    (Platform as { OS: string }).OS = 'android';
    isExactAlarmGrantedMock.mockReturnValue(false);

    await requestNotificationPermissions();

    expect(showConfirmMock).toHaveBeenCalledTimes(1);
    expect(showConfirmMock.mock.calls[0][0]).toMatchObject({
      confirmText: 'Abrir configurações',
    });

    showConfirmMock.mock.calls[0][0].onConfirm();
    expect(openExactAlarmSettings).toHaveBeenCalledTimes(1);
  });

  it('não pede nada quando o Android já concedeu', async () => {
    (Platform as { OS: string }).OS = 'android';
    isExactAlarmGrantedMock.mockReturnValue(true);

    await requestNotificationPermissions();

    expect(showConfirmMock).not.toHaveBeenCalled();
  });

  it('não pede nada no iOS, que não tem essa permissão', async () => {
    (Platform as { OS: string }).OS = 'ios';
    isExactAlarmGrantedMock.mockReturnValue(false);

    await requestNotificationPermissions();

    expect(showConfirmMock).not.toHaveBeenCalled();
  });
});
