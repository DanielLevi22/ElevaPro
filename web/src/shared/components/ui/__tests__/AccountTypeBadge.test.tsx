import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountTypeBadge } from "../AccountTypeBadge";

describe("AccountTypeBadge", () => {
  // Regressão: os mapas antigos usavam as chaves professional/managed_student/
  // autonomous_student, que não existem no enum account_type. Todo lookup caía
  // no fallback cinza exibindo o valor cru do banco.
  it.each([
    ["specialist", "Personal Trainer"],
    ["student", "Aluno"],
    ["member", "Membro"],
    ["admin", "Admin"],
  ])("resolve o rótulo de %s", (accountType, expected) => {
    render(<AccountTypeBadge accountType={accountType} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("não cai no estilo neutro para tipos válidos", () => {
    render(<AccountTypeBadge accountType="specialist" />);
    expect(screen.getByText("Personal Trainer").className).not.toContain("gray");
  });

  it("diferencia super admin de admin comum", () => {
    render(<AccountTypeBadge accountType="admin" isSuperAdmin />);
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("isSuperAdmin não afeta tipos que não são admin", () => {
    render(<AccountTypeBadge accountType="student" isSuperAdmin />);
    expect(screen.getByText("Aluno")).toBeInTheDocument();
  });

  // Divergência de schema deve aparecer, não ser mascarada por um rótulo bonito.
  it("exibe o valor cru em estilo neutro para tipo desconhecido", () => {
    render(<AccountTypeBadge accountType="managed_student" />);
    const badge = screen.getByText("managed_student");
    expect(badge.className).toContain("gray");
  });

  it("aplica o tamanho md sem alterar o rótulo", () => {
    render(<AccountTypeBadge accountType="member" size="md" />);
    expect(screen.getByText("Membro").className).toContain("text-sm");
  });
});
