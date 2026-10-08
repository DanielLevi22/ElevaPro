import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMealCatalogImport } from "../meal-catalog/import.mjs";

const candidate = {
  id: "candidate-0123456789abcdef",
  template: "savory_plate",
  title: "Arroz e frango",
  ingredients: ["Arroz branco cozido", "Frango (peito grelhado)"],
  foodIds: ["old-rice", "old-chicken"],
};

test("importação preserva referência estável e reconcilia alimentos por nome entre ambientes", () => {
  const payload = buildMealCatalogImport([candidate], []);
  assert.equal(payload.dishes[0].id, "candidate-0123456789abcdef");
  assert.deepEqual(payload.dishes[0].ingredients, [
    "Arroz branco cozido",
    "Frango (peito grelhado)",
  ]);
  assert.equal(payload.dishes[0].status, "draft");
  assert.equal(JSON.stringify(payload).includes("old-rice"), false);
});

test("não importa imagem sem verificação nem aceita imagem de candidato ausente", () => {
  assert.throws(
    () => buildMealCatalogImport([candidate], [{ candidateId: candidate.id }]),
    /verificada/,
  );
  assert.throws(() => buildMealCatalogImport([], [{ candidateId: candidate.id }]), /candidato/);
});
