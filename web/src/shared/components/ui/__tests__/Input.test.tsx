import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "../Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Digite algo" />);
    expect(screen.getByPlaceholderText("Digite algo")).toBeInTheDocument();
  });

  it("accepts typed value", async () => {
    render(<Input placeholder="Nome" />);
    const input = screen.getByPlaceholderText("Nome");
    await userEvent.type(input, "João");
    expect(input).toHaveValue("João");
  });

  it("calls onChange handler", async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="Email" />);
    await userEvent.type(screen.getByPlaceholderText("Email"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Input disabled placeholder="Bloqueado" />);
    expect(screen.getByPlaceholderText("Bloqueado")).toBeDisabled();
  });

  it("shows error state with aria-invalid", () => {
    render(<Input error placeholder="Com erro" />);
    expect(screen.getByPlaceholderText("Com erro")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders left icon slot", () => {
    render(<Input placeholder="Buscar" leftIcon={<span data-testid="icon">🔍</span>} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
