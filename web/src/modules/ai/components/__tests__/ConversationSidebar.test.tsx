import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChatSessionSummary } from "../../types";
import { ConversationSidebar } from "../ConversationSidebar";

function conversa(overrides: Partial<ChatSessionSummary> = {}): ChatSessionSummary {
  return {
    id: "sess-1",
    title: null,
    module: "workout",
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

function montar(props: Partial<React.ComponentProps<typeof ConversationSidebar>> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onArchive: vi.fn(),
    onRename: vi.fn(),
  };
  render(<ConversationSidebar sessions={[]} activeId={null} {...handlers} {...props} />);
  return handlers;
}

describe("ConversationSidebar", () => {
  it("oferece começar tanto pelo treino quanto pela nutrição", () => {
    const { onCreate } = montar();

    // O coach de nutrição não tem aba no detalhe do aluno: se ele não estiver
    // aqui, continua alcançável só por quem digita a URL.
    fireEvent.click(screen.getByRole("button", { name: /nova de nutrição/i }));
    expect(onCreate).toHaveBeenCalledWith("nutrition");

    fireEvent.click(screen.getByRole("button", { name: /nova de treino/i }));
    expect(onCreate).toHaveBeenCalledWith("workout");
  });

  it("lista as conversas dos dois coaches juntas", () => {
    montar({
      sessions: [
        conversa({ id: "a", title: "Bloco de força", module: "workout" }),
        conversa({ id: "b", title: "Cutting de verão", module: "nutrition" }),
      ],
    });

    expect(screen.getByText("Bloco de força")).toBeInTheDocument();
    expect(screen.getByText("Cutting de verão")).toBeInTheDocument();
  });

  it("devolve a conversa inteira ao selecionar, não só o id", () => {
    const sessao = conversa({ id: "b", title: "Cutting", module: "nutrition" });
    const { onSelect } = montar({ sessions: [sessao] });

    fireEvent.click(screen.getByRole("button", { name: "Cutting" }));

    // O módulo vem junto porque é ele que decide qual chat abre à direita.
    // Devolver só o id faria a conversa de nutrição abrir no coach de treino.
    expect(onSelect).toHaveBeenCalledWith(sessao);
  });

  it("marca qual conversa está aberta", () => {
    montar({
      sessions: [conversa({ id: "a", title: "Aberta" }), conversa({ id: "b", title: "Outra" })],
      activeId: "a",
    });

    expect(screen.getByRole("button", { name: "Aberta" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Outra" })).not.toHaveAttribute("aria-current");
  });

  it("cai na data quando a conversa ainda não tem título", () => {
    montar({ sessions: [conversa({ created_at: "2026-08-20T10:00:00Z" })] });

    // Nome exato: o botão de arquivar também carrega o rótulo, e um regex
    // casaria com os dois.
    expect(screen.getByRole("button", { name: "Conversa de 20/08" })).toBeInTheDocument();
  });

  it("diz o que fazer quando não há nenhuma conversa", () => {
    montar({ sessions: [] });

    // Lista vazia sem explicação parece falha de carregamento — o padrão que
    // este projeto já pagou caro para distinguir.
    expect(screen.getByText(/nenhuma conversa ainda/i)).toBeInTheDocument();
  });

  it("arquiva a conversa pedida", () => {
    const { onArchive } = montar({ sessions: [conversa({ id: "a", title: "Antiga" })] });

    fireEvent.click(screen.getByRole("button", { name: /arquivar antiga/i }));

    expect(onArchive).toHaveBeenCalledWith("a");
  });

  it("renomeia a conversa e devolve o texto novo", () => {
    const { onRename } = montar({ sessions: [conversa({ id: "a", title: "Sem nome bom" })] });

    fireEvent.click(screen.getByRole("button", { name: /renomear sem nome bom/i }));
    const campo = screen.getByRole("textbox", { name: /novo nome da conversa/i });
    fireEvent.change(campo, { target: { value: "Bloco de força" } });
    fireEvent.keyDown(campo, { key: "Enter" });

    expect(onRename).toHaveBeenCalledWith("a", "Bloco de força");
  });

  it("Escape desiste sem renomear", () => {
    const { onRename } = montar({ sessions: [conversa({ id: "a", title: "Bloco de força" })] });

    fireEvent.click(screen.getByRole("button", { name: /renomear bloco de força/i }));
    const campo = screen.getByRole("textbox", { name: /novo nome da conversa/i });
    fireEvent.change(campo, { target: { value: "abc" } });
    fireEvent.keyDown(campo, { key: "Escape" });

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Bloco de força" })).toBeInTheDocument();
  });

  it("nome vazio é desistência, não apagar o título", () => {
    const { onRename } = montar({ sessions: [conversa({ id: "a", title: "Bloco de força" })] });

    fireEvent.click(screen.getByRole("button", { name: /renomear bloco de força/i }));
    const campo = screen.getByRole("textbox", { name: /novo nome da conversa/i });
    fireEvent.change(campo, { target: { value: "   " } });
    fireEvent.keyDown(campo, { key: "Enter" });

    expect(onRename).not.toHaveBeenCalled();
  });

  it("recolhe e volta, sem perder o caminho de reabrir", () => {
    montar({ sessions: [conversa({ title: "Bloco de força" })] });

    fireEvent.click(screen.getByRole("button", { name: /esconder conversas/i }));
    expect(screen.queryByText("Bloco de força")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mostrar conversas/i }));
    expect(screen.getByText("Bloco de força")).toBeInTheDocument();
  });
});
