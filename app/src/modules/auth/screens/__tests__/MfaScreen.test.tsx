const mockIsPasskeyEnabled = jest.fn(() => false);
const mockHasLegacyTotpFactor = jest.fn();

jest.mock('../../services', () => ({
  beginTotpChallenge: jest.fn(),
  verifyTotp: jest.fn(),
  isPasskeyEnabled: () => mockIsPasskeyEnabled(),
  hasLegacyTotpFactor: () => mockHasLegacyTotpFactor(),
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beginTotpChallenge, verifyTotp } from '../../services';
import { MfaScreen } from '../MfaScreen';

const mockBeginTotpChallenge = beginTotpChallenge as jest.Mock;
const mockVerifyTotp = verifyTotp as jest.Mock;

/**
 * Prova que a tela liga o controller aos blocos de apresentação (QR Code,
 * chave manual, formulário) — o comportamento do controller em si já está
 * coberto em `useTotpEnrollment.test.ts`, sem renderizar nada.
 */
describe('MfaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPasskeyEnabled.mockReturnValue(false);
  });

  it('oferece Face ID ou PIN sem pedir código no login diário', async () => {
    mockIsPasskeyEnabled.mockReturnValue(true);
    mockHasLegacyTotpFactor.mockResolvedValue(true);
    const tela = render(<MfaScreen />);

    expect(tela.getByText('Entrar com Face ID ou PIN')).toBeTruthy();
    expect(tela.queryByLabelText('Código do autenticador')).toBeNull();
    expect(mockHasLegacyTotpFactor).not.toHaveBeenCalled();
    expect(mockBeginTotpChallenge).not.toHaveBeenCalled();
  });

  it('só prepara o autenticador ao escolher cadastrar aparelho', async () => {
    mockIsPasskeyEnabled.mockReturnValue(true);
    mockHasLegacyTotpFactor.mockResolvedValue(true);
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1' });
    const tela = render(<MfaScreen />);

    fireEvent.press(tela.getByText('Cadastrar ou trocar aparelho'));

    await waitFor(() => expect(tela.getByLabelText('Código do autenticador')).toBeTruthy());
    expect(mockBeginTotpChallenge).toHaveBeenCalledTimes(1);
  });

  it('mostra o QR Code depois de carregar', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    const tela = render(<MfaScreen />);

    await waitFor(() => expect(tela.getByText(/escaneie o qr code/i)).toBeTruthy());
  });

  it('mostra e esconde a chave manual', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', secret: 'CHAVE-SECRETA' });
    const tela = render(<MfaScreen />);

    await waitFor(() => expect(tela.getByText('Mostrar chave manual')).toBeTruthy());
    expect(tela.queryByText('CHAVE-SECRETA')).toBeNull();

    fireEvent.press(tela.getByText('Mostrar chave manual'));
    expect(tela.getByText('CHAVE-SECRETA')).toBeTruthy();
  });

  it('mostra o erro e permite tentar de novo quando a preparação falha', async () => {
    mockBeginTotpChallenge.mockRejectedValueOnce(new Error('falhou'));
    const tela = render(<MfaScreen />);

    await waitFor(() => expect(tela.getByText(/não foi possível preparar/i)).toBeTruthy());

    mockBeginTotpChallenge.mockResolvedValueOnce({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    fireEvent.press(tela.getByText('Tentar novamente'));

    await waitFor(() => expect(tela.getByText(/escaneie o qr code/i)).toBeTruthy());
  });

  it('confirma o código de 6 dígitos', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    mockVerifyTotp.mockResolvedValue(undefined);
    const tela = render(<MfaScreen />);

    await waitFor(() => expect(tela.getByLabelText('Código do autenticador')).toBeTruthy());

    fireEvent.changeText(tela.getByLabelText('Código do autenticador'), '123456');
    fireEvent.press(tela.getByText('Confirmar código'));

    await waitFor(() => expect(mockVerifyTotp).toHaveBeenCalledWith('factor-1', '123456'));
  });
});
