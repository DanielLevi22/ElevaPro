import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createDirectoryStore } from "../../web/src/modules/nutrition/services/media/directory.mjs";
import { buildMealCandidates } from "../meal-catalog/candidates.mjs";
import { publishCandidateImage } from "../meal-catalog/production.mjs";
import { selectImageBatch } from "../meal-catalog/queue.mjs";

const foods = [
  { id: "rice", name: "Arroz branco cozido", category: "carboidrato" },
  { id: "chicken", name: "Frango (peito grelhado)", category: "proteina" },
  { id: "broccoli", name: "Brócolis cozido", category: "hortalica" },
  { id: "creatine", name: "Creatina monoidratada", category: "suplemento" },
];

test("não inclui creatina em prato e o ID não muda ao reordenar o inventário", () => {
  const candidates = buildMealCandidates(foods);
  assert.ok(candidates.length > 0);
  assert.deepEqual(buildMealCandidates([...foods].reverse()), candidates);
  assert.ok(candidates.every((option) => !option.foodIds.includes("creatine")));
});

test("fila retomada ignora concluídos e não repete uma combinação no lote", () => {
  const candidates = buildMealCandidates(foods);
  const first = candidates[0];
  assert.deepEqual(selectImageBatch([...candidates, first], [first.id], 8), []);
  assert.deepEqual(selectImageBatch([first, first], [], 8), [first]);
  assert.throws(() => selectImageBatch(candidates, [], 0), /esperado inteiro/);
});

test("imagem conferida pode concluir sem mudar a aprovação da receita", async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const candidate = buildMealCandidates(foods)[0];
  const store = createDirectoryStore(await mkdtemp(join(tmpdir(), "eleva-candidate-")));
  const result = await publishCandidateImage(candidate, bytes, store);
  assert.equal(result.imageStatus, "completed");
  assert.equal(result.reviewStatus, "pending");
  assert.match(result.asset.path, /^meal-images\/[^/]+\.jpg$/);
});

test("não marca imagem concluída quando o storage devolve bytes diferentes", async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const store = { write: async () => {}, read: async () => Buffer.from("corrompido") };
  await assert.rejects(
    publishCandidateImage(buildMealCandidates(foods)[0], bytes, store),
    /ARQUIVO CORROMPIDO/,
  );
});
