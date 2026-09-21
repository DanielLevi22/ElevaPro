import { useCallback, useState } from "react";
import {
  beginTotpChallenge,
  MfaSetupUnavailableError,
  type TotpChallenge,
  verifyTotp,
} from "../services";

export type UseTotpEnrollmentOptions = {
  /** Chamado depois que o código de 6 dígitos é confirmado com sucesso. */
  onVerified?: () => void;
};

export type UseTotpEnrollmentResult = {
  challenge: TotpChallenge | null;
  code: string;
  setCode: (value: string) => void;
  loading: boolean;
  error: string;
  prepareChallenge: () => Promise<void>;
  confirmCode: () => Promise<void>;
};

/**
 * Controller da inscrição TOTP na web: prepara o desafio sob demanda (só ao
 * clicar em "Configurar autenticador" — diferente do mobile, que prepara ao
 * montar) e confirma o código de 6 dígitos.
 *
 * `onVerified` fica de fora do hook: para onde navegar depois da confirmação
 * é decisão de quem monta a página, não do protocolo TOTP.
 *
 * @example
 * const { challenge, prepareChallenge, confirmCode } = useTotpEnrollment({
 *   onVerified: () => router.replace("/dashboard"),
 * });
 */
export function useTotpEnrollment({
  onVerified,
}: UseTotpEnrollmentOptions = {}): UseTotpEnrollmentResult {
  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const prepareChallenge = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      setChallenge(await beginTotpChallenge());
    } catch (err: unknown) {
      setError(
        err instanceof MfaSetupUnavailableError
          ? err.message
          : "Não foi possível preparar seu autenticador. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmCode = useCallback(async (): Promise<void> => {
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError("Digite o código de 6 dígitos do seu autenticador.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await verifyTotp(challenge.factorId, code);
      onVerified?.();
    } catch {
      setError("Código inválido ou expirado. Gere um novo código e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [challenge, code, onVerified]);

  const handleSetCode = useCallback((value: string) => setCode(value.replace(/\D/g, "")), []);

  return { challenge, code, setCode: handleSetCode, loading, error, prepareChallenge, confirmCode };
}
