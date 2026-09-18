import { describe, expect, it } from "vitest";
import { passwordValidationError } from "../../auth/password-policy";

describe("passwordValidationError", () => {
  it("aceita uma senha que cumpre todos os requisitos", () => {
    expect(passwordValidationError("Senha@123")).toBeNull();
  });

  it.each([
    "S@1a",
    "senhaw123!",
    "SENHA123!",
    "Senhaaaaa!",
    "Senha1234",
    undefined,
  ])("rejeita senha fora da política: %s", (password) => {
    expect(passwordValidationError(password)).not.toBeNull();
  });
});
