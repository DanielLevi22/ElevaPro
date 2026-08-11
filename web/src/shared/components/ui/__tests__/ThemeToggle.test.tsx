import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

const setTheme = vi.fn();
let resolvedTheme = "dark";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    resolvedTheme = "dark";
  });

  it("no escuro, oferece trocar para o claro", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Ativar tema claro" })).toBeInTheDocument();
  });

  it("no claro, oferece trocar para o escuro", () => {
    resolvedTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Ativar tema escuro" })).toBeInTheDocument();
  });

  it.each([
    ["dark", "light"],
    ["light", "dark"],
  ])("de %s, o clique pede %s", async (current, expected) => {
    resolvedTheme = current;
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    expect(setTheme).toHaveBeenCalledWith(expected);
  });

  // Regressão: o dashboard ficou preso no escuro porque `dark` estava cravado no
  // <body>, vencendo a classe que o next-themes escreve no <html>. O alternador
  // precisa depender só do resolvedTheme, nunca de classe fixa no documento.
  it("segue o resolvedTheme mesmo com classe de tema no documento", () => {
    document.documentElement.classList.add("dark");
    resolvedTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Ativar tema escuro" })).toBeInTheDocument();
    document.documentElement.classList.remove("dark");
  });
});
