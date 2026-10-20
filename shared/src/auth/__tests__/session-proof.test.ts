import { describe, expect, it } from "vitest";
import type { AccountType } from "../../types/auth.types";
import { isStrongAuthRequired } from "../session-proof";

/**
 * Quem precisa de segundo fator para acessar (ADR-0047).
 *
 * Telas e BFF perguntam a esta função; a RLS repete a regra em
 * `private.current_session_meets_mfa_requirement()`. Mudar um papel aqui sem
 * mudar a migration deixa as camadas discordando.
 */
describe("isStrongAuthRequired", () => {
  // Art. 46: o admin alcança todas as contas, e senha sozinha não basta.
  it("exige segundo fator do admin", () => {
    expect(isStrongAuthRequired("admin"), "ADMIN SEM SEGUNDO FATOR").toBe(true);
  });

  it.each<AccountType>([
    "specialist",
    "student",
    "member",
  ])("não exige segundo fator de %s", (accountType) => {
    expect(isStrongAuthRequired(accountType)).toBe(false);
  });

  it("não exige segundo fator sem papel carregado", () => {
    expect(isStrongAuthRequired(null)).toBe(false);
  });
});
