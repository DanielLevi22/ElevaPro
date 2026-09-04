import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PainelDeProposta } from "../PainelDeProposta";

/**
 * O painel existe para a proposta parar de andar pela tela.
 *
 * Enquanto o cartão era o último item da lista de mensagens, texto novo entrava
 * antes dele e enviar a mensagem seguinte o fazia sumir — junto com o único
 * botão de aprovar. Estes testes fixam as duas garantias que vieram disso:
 * proposta pendente não pode ser fechada, e o conteúdo não depende do que a
 * conversa fez depois.
 */

const abrir = (props: Partial<React.ComponentProps<typeof PainelDeProposta>> = {}) =>
  render(
    <PainelDeProposta titulo="Proposta de treinos" resolvido={false} onFechar={vi.fn()} {...props}>
      <p>Treino A — Full Body</p>
    </PainelDeProposta>,
  );

describe("painel de proposta", () => {
  it("mostra a proposta e o título", () => {
    abrir({ resolvido: false });

    expect(screen.getByText("Treino A — Full Body")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Proposta de treinos" })).toBeInTheDocument();
  });

  // Fechar antes de salvar tiraria da tela o caminho da aprovação, que só
  // existe dentro do cartão.
  it("proposta pendente não oferece fechar", () => {
    abrir({ resolvido: false });

    expect(screen.queryByRole("button", { name: /Fechar/ })).not.toBeInTheDocument();
  });

  it("proposta salva pode ser fechada por quem quiser", () => {
    const onFechar = vi.fn();
    abrir({ resolvido: true, onFechar });

    fireEvent.click(screen.getByRole("button", { name: "Fechar Proposta de treinos" }));

    expect(onFechar).toHaveBeenCalledOnce();
  });

  // Enquanto há decisão a tomar, ocupar espaço é o certo: é ali que mora o
  // botão de aprovar.
  it("proposta pendente abre expandida", () => {
    abrir({ resolvido: false });

    expect(screen.getByText("Treino A — Full Body")).toBeInTheDocument();
  });

  // Depois de salva não há o que decidir, e o painel aberto empurrava para fora
  // justamente a mensagem que confirma o que foi salvo.
  it("proposta já resolvida abre recolhida", () => {
    abrir({ resolvido: true });

    expect(screen.queryByText("Treino A — Full Body")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });

  it("recolhe sozinha ao deixar de haver decisão a tomar", () => {
    const { rerender } = abrir({ resolvido: false });
    expect(screen.getByText("Treino A — Full Body")).toBeInTheDocument();

    rerender(
      <PainelDeProposta titulo="Proposta de treinos" resolvido onFechar={vi.fn()}>
        <p>Treino A — Full Body</p>
      </PainelDeProposta>,
    );

    expect(screen.queryByText("Treino A — Full Body")).not.toBeInTheDocument();
  });

  // O recolhimento automático acontece na transição, uma vez. Quem abre de novo
  // para conferir o que salvou não pode ser recolhido pelas costas.
  it("expandir à mão depois de salvo continua expandido", () => {
    const { rerender } = abrir({ resolvido: true });

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Treino A — Full Body")).toBeInTheDocument();

    rerender(
      <PainelDeProposta titulo="Proposta de treinos" resolvido onFechar={vi.fn()}>
        <p>Treino A — Full Body</p>
      </PainelDeProposta>,
    );

    expect(screen.getByText("Treino A — Full Body")).toBeInTheDocument();
  });

  it("recolhe e volta sem perder a proposta", () => {
    abrir();
    const cabecalho = screen.getByRole("button", { expanded: true });

    fireEvent.click(cabecalho);
    expect(screen.queryByText("Treino A — Full Body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Treino A — Full Body")).toBeInTheDocument();
  });
});
