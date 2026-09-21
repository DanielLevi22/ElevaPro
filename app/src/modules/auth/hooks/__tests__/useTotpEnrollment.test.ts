jest.mock('../../services', () => ({
  beginTotpChallenge: jest.fn(),
  verifyTotp: jest.fn(),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beginTotpChallenge, verifyTotp } from '../../services';
import { useTotpEnrollment } from '../useTotpEnrollment';

const mockBeginTotpChallenge = beginTotpChallenge as jest.Mock;
const mockVerifyTotp = verifyTotp as jest.Mock;

/**
 * Prova o controller isolado da tela: carregamento, erro, retry e
 * confirmação — os mesmos cenários que a issue pede, sem renderizar nada.
 */
describe('useTotpEnrollment', () => {
  beforeEach(() => jest.resetAllMocks());

  it('prepara o desafio ao montar', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });

    const { result } = renderHook(() => useTotpEnrollment());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenge).toEqual({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    expect(mockBeginTotpChallenge).toHaveBeenCalledTimes(1);
  });

  it('expõe erro quando a preparação falha, sem travar o loading', async () => {
    mockBeginTotpChallenge.mockRejectedValue(new Error('falhou'));

    const { result } = renderHook(() => useTotpEnrollment());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/não foi possível preparar/i);
    expect(result.current.challenge).toBeNull();
  });

  it('tenta de novo ao chamar prepareChallenge, limpando o erro anterior', async () => {
    mockBeginTotpChallenge
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce({ factorId: 'factor-1', uri: 'otpauth://totp/x' });

    const { result } = renderHook(() => useTotpEnrollment());
    await waitFor(() => expect(result.current.error).not.toBe(''));

    await act(() => result.current.prepareChallenge());

    expect(result.current.error).toBe('');
    expect(result.current.challenge).toEqual({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    expect(mockBeginTotpChallenge).toHaveBeenCalledTimes(2);
  });

  it('recusa confirmar sem um código de 6 dígitos', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });

    const { result } = renderHook(() => useTotpEnrollment());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCode('123'));
    await act(() => result.current.confirmCode());

    expect(result.current.error).toMatch(/código de 6 dígitos/i);
    expect(mockVerifyTotp).not.toHaveBeenCalled();
  });

  it('confirma o código e chama onVerified', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    mockVerifyTotp.mockResolvedValue(undefined);
    const onVerified = jest.fn();

    const { result } = renderHook(() => useTotpEnrollment({ onVerified }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCode('123456'));
    await act(() => result.current.confirmCode());

    expect(mockVerifyTotp).toHaveBeenCalledWith('factor-1', '123456');
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('');
  });

  it('expõe erro quando o código é inválido, sem chamar onVerified', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });
    mockVerifyTotp.mockRejectedValue(new Error('invalid'));
    const onVerified = jest.fn();

    const { result } = renderHook(() => useTotpEnrollment({ onVerified }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCode('123456'));
    await act(() => result.current.confirmCode());

    expect(result.current.error).toMatch(/código inválido ou expirado/i);
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('só aceita dígitos no código', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', uri: 'otpauth://totp/x' });

    const { result } = renderHook(() => useTotpEnrollment());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCode('12a3b4'));
    expect(result.current.code).toBe('1234');
  });

  it('alterna a visibilidade da chave manual', async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: 'factor-1', secret: 'ABCD' });

    const { result } = renderHook(() => useTotpEnrollment());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.showManualKey).toBe(false);
    act(() => result.current.toggleManualKey());
    expect(result.current.showManualKey).toBe(true);
  });
});
