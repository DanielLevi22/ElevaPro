import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "../PasswordInput";

describe("PasswordInput", () => {
  it("permite revelar e ocultar a senha sem enviar o formulário", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);
    const password = screen.getByLabelText("Senha");

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(password).toHaveAttribute("type", "password");
  });
});
