import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("renders label text", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("associates label with input via htmlFor", () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <input id="name" />
      </FormField>,
    );
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(
      <FormField label="Email" htmlFor="email" error="Email inválido">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
  });

  it("renders hint when provided and no error", () => {
    render(
      <FormField label="Senha" htmlFor="pass" hint="Mínimo 8 caracteres">
        <input id="pass" />
      </FormField>,
    );
    expect(screen.getByText("Mínimo 8 caracteres")).toBeInTheDocument();
  });

  it("shows error instead of hint when both provided", () => {
    render(
      <FormField label="Senha" htmlFor="pass" hint="Mínimo 8 caracteres" error="Senha obrigatória">
        <input id="pass" />
      </FormField>,
    );
    expect(screen.getByText("Senha obrigatória")).toBeInTheDocument();
    expect(screen.queryByText("Mínimo 8 caracteres")).not.toBeInTheDocument();
  });

  it("marks label as optional when optional prop is true", () => {
    render(
      <FormField label="Telefone" htmlFor="phone" optional>
        <input id="phone" />
      </FormField>,
    );
    expect(screen.getByText("(opcional)")).toBeInTheDocument();
  });
});
