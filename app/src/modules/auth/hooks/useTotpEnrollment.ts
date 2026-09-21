import { useCallback, useEffect, useState } from 'react';
import { beginTotpChallenge, type TotpChallenge, verifyTotp } from '../services';

export type UseTotpEnrollmentOptions = {
  /** Chamado depois que o código de 6 dígitos é confirmado com sucesso. */
  onVerified?: () => void;
};

export type UseTotpEnrollmentResult = {
  challenge: TotpChallenge | null;
  code: string;
  setCode: (value: string) => void;
  loading: boolean;
  verifying: boolean;
  error: string;
  showManualKey: boolean;
  toggleManualKey: () => void;
  prepareChallenge: () => Promise<void>;
  confirmCode: () => Promise<void>;
};

/**
 * Controller da inscrição TOTP: prepara o desafio ao montar, valida o código
 * de 6 dígitos e confirma. A tela só renderiza o que este hook expõe — nada
 * de rede ou orquestração mora em `MfaScreen`.
 *
 * `onVerified` fica de fora do hook de propósito: o que acontece depois da
 * confirmação (trocar de rota, religar a sessão) é decisão de quem monta a
 * tela, não do protocolo TOTP.
 *
 * @example
 * const { challenge, code, setCode, confirmCode } = useTotpEnrollment({
 *   onVerified: () => useAuthStore.getState().initializeSession(session),
 * });
 */
export function useTotpEnrollment({
  onVerified,
}: UseTotpEnrollmentOptions = {}): UseTotpEnrollmentResult {
  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);
  const [error, setError] = useState('');

  const prepareChallenge = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    setShowManualKey(false);
    setChallenge(null);
    try {
      setChallenge(await beginTotpChallenge());
    } catch {
      setError('Não foi possível preparar seu autenticador. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void prepareChallenge();
  }, [prepareChallenge]);

  const confirmCode = useCallback(async (): Promise<void> => {
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError('Digite o código de 6 dígitos do seu autenticador.');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      await verifyTotp(challenge.factorId, code);
      onVerified?.();
    } catch {
      setError('Código inválido ou expirado. Gere um novo código e tente novamente.');
    } finally {
      setVerifying(false);
    }
  }, [challenge, code, onVerified]);

  const handleSetCode = useCallback((value: string) => setCode(value.replace(/\D/g, '')), []);
  const toggleManualKey = useCallback(() => setShowManualKey((visible) => !visible), []);

  return {
    challenge,
    code,
    setCode: handleSetCode,
    loading,
    verifying,
    error,
    showManualKey,
    toggleManualKey,
    prepareChallenge,
    confirmCode,
  };
}
