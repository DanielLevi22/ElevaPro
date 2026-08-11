import { describe, expect, it } from "vitest";
import { DietPermissionError } from "../useNutrition";

describe("DietPermissionError", () => {
  // Regressão: um specialist sem linha em `specialist_services` tinha o acesso
  // negado pelo CASL, a query era repetida 3× com backoff e terminava num
  // estado vazio idêntico a "nenhum plano cadastrado". A causa ficava invisível.
  it("nomeia a conta e os serviços que causaram a negação", () => {
    const error = new DietPermissionError("specialist", []);
    expect(error.message).toContain('"specialist"');
    expect(error.message).toContain("[nenhum]");
  });

  it("lista os serviços quando existem", () => {
    const error = new DietPermissionError("specialist", ["personal_training"]);
    expect(error.message).toContain("[personal_training]");
  });

  it("diz o que é preciso para resolver", () => {
    const error = new DietPermissionError("admin", []);
    expect(error.message).toContain("specialist_services");
    expect(error.message).toContain("nutrition_consulting");
  });

  // O predicado de retry usa `instanceof`: sem a cadeia de protótipo correta,
  // a negação voltaria a ser repetida com backoff.
  it("permanece reconhecível por instanceof", () => {
    const error = new DietPermissionError("specialist", []);
    expect(error).toBeInstanceOf(DietPermissionError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DietPermissionError");
  });
});
