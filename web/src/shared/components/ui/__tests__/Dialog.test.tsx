import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "../Dialog";

describe("Dialog", () => {
  it("is not visible when open is false", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Teste">
        <p>Conteúdo</p>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is visible when open is true", () => {
    render(
      <Dialog open={true} onClose={vi.fn()} title="Teste">
        <p>Conteúdo</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(
      <Dialog open={true} onClose={vi.fn()} title="Meu Título">
        <p>Conteúdo</p>
      </Dialog>,
    );
    expect(screen.getByText("Meu Título")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <Dialog open={true} onClose={vi.fn()} title="Título">
        <p>Corpo do modal</p>
      </Dialog>,
    );
    expect(screen.getByText("Corpo do modal")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="Fechar">
        <p>Conteúdo</p>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="Fechar">
        <p>Conteúdo</p>
      </Dialog>,
    );
    const backdrop = screen.getByRole("dialog").parentElement;
    if (backdrop) await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
