import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { openInviteLink } = vi.hoisted(() => ({ openInviteLink: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/modules/auth", () => ({
  useAuthStore: { getState: () => ({ openInviteLink, completeAccountInvite: vi.fn() }) },
}));

import ResetPasswordPage from "./page";

// O aluno define a senha pelo link do e-mail e não tinha como conferir o que digitou.
describe("tela de definir a senha do convite", () => {
  it("deixa ver a senha digitada nos dois campos", async () => {
    openInviteLink.mockResolvedValue({ success: true });
    render(<ResetPasswordPage />);

    const toggles = await screen.findAllByRole("button", { name: "Mostrar senha" });
    expect(toggles, "SEM OLHO: campo de senha do convite não deixa conferir").toHaveLength(2);

    await userEvent.type(screen.getByLabelText("Nova senha"), "Senha123!");
    await userEvent.click(toggles[0]);
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirme a nova senha")).toHaveAttribute("type", "password");
  });
});
