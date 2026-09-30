import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { beginTotpChallenge, hasLegacyTotpFactor } = vi.hoisted(() => ({
  beginTotpChallenge: vi.fn(),
  hasLegacyTotpFactor: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/modules/auth", () => ({
  beginTotpChallenge,
  hasLegacyTotpFactor,
  isPasskeyEnabled: () => true,
  useAuthStore: { getState: () => ({ accountType: "specialist" }) },
}));
vi.mock("@/modules/auth/services", () => ({
  beginTotpChallenge,
  verifyTotp: vi.fn(),
  MfaSetupUnavailableError: class extends Error {},
}));

import MfaPage from "./page";

describe("login diário com Passkey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("oferece Face ID/PIN sem preparar o autenticador", () => {
    render(<MfaPage />);

    expect(screen.getByRole("button", { name: "Entrar com Face ID ou PIN" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Código do autenticador")).not.toBeInTheDocument();
    expect(beginTotpChallenge).not.toHaveBeenCalled();
    expect(hasLegacyTotpFactor).not.toHaveBeenCalled();
  });

  it("reserva o código para o cadastro de aparelho", async () => {
    hasLegacyTotpFactor.mockResolvedValue(true);
    beginTotpChallenge.mockResolvedValue({ factorId: "factor-1" });
    render(<MfaPage />);

    fireEvent.click(screen.getByRole("button", { name: "Cadastrar ou trocar aparelho" }));
    fireEvent.click(screen.getByRole("button", { name: "Configurar autenticador" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Código do autenticador")).toBeInTheDocument(),
    );
    expect(beginTotpChallenge).toHaveBeenCalledOnce();
  });
});
