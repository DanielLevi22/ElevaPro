import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("renders with label", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Bloqueado</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Bloqueado
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies primary variant styles by default", () => {
    render(<Button>Primário</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-primary/);
  });

  it("applies ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-transparent/);
  });

  // Token semantico, nao cor crua: `bg-red-600` nao acompanha o tema, e era
  // esse acoplamento que fazia cada botao precisar de conserto proprio.
  it("applies destructive variant styles", () => {
    render(<Button variant="destructive">Excluir</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-destructive/);
    expect(btn.className).not.toMatch(/bg-red/);
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-10"],
    ["lg", "h-12"],
  ] as const)("applies %s size styles", (size, expectedHeight) => {
    render(<Button size={size}>Tamanho</Button>);
    expect(screen.getByRole("button").className).toContain(expectedHeight);
  });

  // Sem type explicito o botao vira submit e envia o formulario que o contem.
  it("defaults to type=button", () => {
    render(<Button>Acao</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("respects an explicit type", () => {
    render(<Button type="submit">Salvar</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("shows loading state", () => {
    render(<Button isLoading>Carregando</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg")).toBeInTheDocument();
  });

  it("renders as child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/rota">Link</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Link" })).toBeInTheDocument();
  });
});
