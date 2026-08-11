import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "../DataTable";

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: "1", name: "Primeiro", status: "Ativo" },
  { id: "2", name: "Segundo", status: "Inativo" },
];

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Nome", render: (row) => row.name },
  { key: "status", header: "Status", width: "md:w-24", render: (row) => row.status },
];

describe("DataTable", () => {
  it("renderiza cabecalho e celulas de cada coluna", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText("Nome")).toBeInTheDocument();
    expect(screen.getByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("com rowHref, cada linha vira link", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/item/${r.id}`}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/item/1");
  });

  it("com onRowClick, cada linha vira botao", async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText("Primeiro"));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  // A area navegavel abrange varias colunas, entao o leitor de tela precisa de
  // um rotulo proprio -- senao anuncia a concatenacao de todas as celulas.
  it("aplica rotulo acessivel na area navegavel", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/item/${r.id}`}
        rowLabel={(r) => `Abrir ${r.name}`}
      />,
    );
    expect(screen.getByRole("link", { name: "Abrir Primeiro" })).toBeInTheDocument();
  });

  // Botao dentro de link e HTML invalido e quebra o clique. A acao precisa ficar
  // fora da area navegavel, como irma.
  it("a acao da linha fica fora do link e nao navega", async () => {
    const onAction = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/item/${r.id}`}
        rowAction={(r) => (
          <button type="button" aria-label={`Excluir ${r.name}`} onClick={() => onAction(r.id)}>
            x
          </button>
        )}
      />,
    );

    const action = screen.getByRole("button", { name: "Excluir Primeiro" });
    expect(action.closest("a")).toBeNull();

    await userEvent.click(action);
    expect(onAction).toHaveBeenCalledWith("1");
  });

  it("carregando, mostra esqueleto no lugar das linhas", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading />);
    expect(screen.queryByText("Primeiro")).not.toBeInTheDocument();
    expect(screen.queryByText("Nome")).not.toBeInTheDocument();
  });

  it("sem linhas, mostra o estado vazio recebido", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        emptyState={<p>Nada por aqui</p>}
      />,
    );
    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.queryByText("Nome")).not.toBeInTheDocument();
  });

  // Regressao: o Tailwind so gera classe que aparece literalmente no fonte.
  // Montar `${breakpoint}:${width}` produzia classe inexistente no CSS.
  it("usa a largura exatamente como recebida, sem montar prefixo", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText("Status").className).toContain("md:w-24");
  });
});
