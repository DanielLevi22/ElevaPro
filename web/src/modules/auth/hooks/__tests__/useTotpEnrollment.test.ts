import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services", () => ({
  beginTotpChallenge: vi.fn(),
  verifyTotp: vi.fn(),
  MfaSetupUnavailableError: class MfaSetupUnavailableError extends Error {},
}));

import { beginTotpChallenge, MfaSetupUnavailableError, verifyTotp } from "../../services";
import { useTotpEnrollment } from "../useTotpEnrollment";

const mockBeginTotpChallenge = vi.mocked(beginTotpChallenge);
const mockVerifyTotp = vi.mocked(verifyTotp);

/**
 * Prova o controller isolado da página: carregamento, erro, retry e
 * confirmação — os mesmos cenários que a issue pede, sem renderizar nada.
 *
 * Ao contrário do mobile, a web não prepara o desafio sozinha: o fluxo atual
 * espera o clique em "Configurar autenticador", e é isso que este hook
 * preserva.
 */
describe("useTotpEnrollment", () => {
  beforeEach(() => vi.resetAllMocks());

  it("não prepara nada ao montar", () => {
    const { result } = renderHook(() => useTotpEnrollment());

    expect(result.current.loading).toBe(false);
    expect(result.current.challenge).toBeNull();
    expect(mockBeginTotpChallenge).not.toHaveBeenCalled();
  });

  it("prepara o desafio ao chamar prepareChallenge", async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: "factor-1", qrCode: "data:image/x" });

    const { result } = renderHook(() => useTotpEnrollment());
    await act(() => result.current.prepareChallenge());

    expect(result.current.challenge).toEqual({ factorId: "factor-1", qrCode: "data:image/x" });
    expect(result.current.loading).toBe(false);
  });

  it("mostra a mensagem específica quando o MFA está indisponível", async () => {
    const indisponivel = new MfaSetupUnavailableError();
    mockBeginTotpChallenge.mockRejectedValue(indisponivel);

    const { result } = renderHook(() => useTotpEnrollment());
    await act(() => result.current.prepareChallenge());

    expect(result.current.error).toBe(indisponivel.message);
  });

  it("mostra mensagem genérica para qualquer outro erro de preparação", async () => {
    mockBeginTotpChallenge.mockRejectedValue(new Error("timeout"));

    const { result } = renderHook(() => useTotpEnrollment());
    await act(() => result.current.prepareChallenge());

    expect(result.current.error).toMatch(/não foi possível preparar/i);
  });

  it("tenta de novo ao chamar prepareChallenge outra vez, limpando o erro anterior", async () => {
    mockBeginTotpChallenge
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ factorId: "factor-1", qrCode: "data:image/x" });

    const { result } = renderHook(() => useTotpEnrollment());
    await act(() => result.current.prepareChallenge());
    expect(result.current.error).not.toBe("");

    await act(() => result.current.prepareChallenge());

    expect(result.current.error).toBe("");
    expect(result.current.challenge).toEqual({ factorId: "factor-1", qrCode: "data:image/x" });
  });

  it("recusa confirmar sem um código de 6 dígitos", async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: "factor-1", qrCode: "data:image/x" });

    const { result } = renderHook(() => useTotpEnrollment());
    await act(() => result.current.prepareChallenge());

    act(() => result.current.setCode("123"));
    await act(() => result.current.confirmCode());

    expect(result.current.error).toMatch(/código de 6 dígitos/i);
    expect(mockVerifyTotp).not.toHaveBeenCalled();
  });

  it("confirma o código e chama onVerified", async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: "factor-1", qrCode: "data:image/x" });
    mockVerifyTotp.mockResolvedValue(undefined);
    const onVerified = vi.fn();

    const { result } = renderHook(() => useTotpEnrollment({ onVerified }));
    await act(() => result.current.prepareChallenge());

    act(() => result.current.setCode("123456"));
    await act(() => result.current.confirmCode());

    expect(mockVerifyTotp).toHaveBeenCalledWith("factor-1", "123456");
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe("");
  });

  it("expõe erro quando o código é inválido, sem chamar onVerified", async () => {
    mockBeginTotpChallenge.mockResolvedValue({ factorId: "factor-1", qrCode: "data:image/x" });
    mockVerifyTotp.mockRejectedValue(new Error("invalid"));
    const onVerified = vi.fn();

    const { result } = renderHook(() => useTotpEnrollment({ onVerified }));
    await act(() => result.current.prepareChallenge());

    act(() => result.current.setCode("123456"));
    await act(() => result.current.confirmCode());

    expect(result.current.error).toMatch(/código inválido ou expirado/i);
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("só aceita dígitos no código", async () => {
    const { result } = renderHook(() => useTotpEnrollment());

    act(() => result.current.setCode("12a3b4"));
    await waitFor(() => expect(result.current.code).toBe("1234"));
  });
});
