import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertLocalApi, resetTotpFactors } from "../local-reset-mfa.mjs";

/**
 * O comando que remove os autenticadores das contas de teste locais (#355).
 *
 * Ele usa a chave `service_role`, que apaga o segundo fator de qualquer conta.
 * Art. 46: contra o preview ou a produção, isso derrubaria a proteção de quem
 * acessa dados de saúde — por isso ele só aceita a API da própria máquina.
 */

describe("assertLocalApi", () => {
  it("aceita a API do Supabase da máquina", () => {
    assert.doesNotThrow(() => assertLocalApi("http://127.0.0.1:47321"));
    assert.doesNotThrow(() => assertLocalApi("http://localhost:47321"));
  });

  for (const url of [
    "https://lcwzijtunmlvvrqtproh.supabase.co",
    "http://localhost.evil.com:47321",
    "http://10.0.0.5:47321",
    "",
  ]) {
    it(`recusa ${url || "URL vazia"}`, () => {
      assert.throws(
        () => assertLocalApi(url),
        /local/,
        "SEGUNDO FATOR APAGADO FORA DA MÁQUINA: a limpeza aceitou uma API remota",
      );
    });
  }
});

describe("resetTotpFactors", () => {
  it("remove só os fatores TOTP, de todas as contas", async () => {
    const removed = [];
    const api = {
      listUsers: async () => [
        { id: "u1", factors: [{ id: "f1", factor_type: "totp" }] },
        { id: "u2", factors: [{ id: "f2", factor_type: "phone" }] },
        { id: "u3" },
      ],
      deleteFactor: async (userId, factorId) => void removed.push(`${userId}/${factorId}`),
    };

    const count = await resetTotpFactors(api);

    assert.equal(count, 1);
    assert.deepEqual(removed, ["u1/f1"]);
  });
});
