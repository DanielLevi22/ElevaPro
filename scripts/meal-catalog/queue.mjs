import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildMealCandidates } from "./candidates.mjs";
import { loadProductionLedger, loadPublicFoods, productionRoot } from "./checklist.mjs";

const PRESENTATIONS = {
  savory_plate: "Arrange the three foods in adjacent sections in a white ceramic shallow bowl.",
  legume_plate: "Arrange grains, cooked legumes and vegetables in a white ceramic shallow bowl.",
  sandwich: "Show the bread or carrier with its named filling on a white ceramic plate.",
  yogurt_bowl: "Show the yogurt beneath the named fruit and topping in a white ceramic bowl.",
  smoothie: "Blend the two named foods into a smoothie served in a clear unbranded glass.",
  porridge:
    "Cook the named oats in the named milk or beverage, with the fruit on top in a white ceramic bowl.",
  seasoned_side:
    "Show the named cooked vegetable finished with only the named seasoning and fat in a white ceramic bowl.",
  snack_plate: "Show the named ready-to-eat snack beside the named fruit on a white ceramic plate.",
  paired_drink:
    "Show the named snack on a white ceramic plate with the named beverage in an unbranded glass or cup beside it.",
  protein_drink:
    "Show a smooth drink made by mixing the named supplement powder into the named beverage in a clear unbranded glass.",
};

/** Seleciona a próxima parte da fila, excluindo conclusões verificadas. @example selectImageBatch(candidates, completed, 8) */
/** @param {import('./candidates.mjs').MealCandidate[]} candidates @param {string[]} completed @param {number} limit */
export function selectImageBatch(candidates, completed, limit) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12)
    throw new Error(`Tamanho de lote inválido: ${limit}; esperado inteiro entre 1 e 12.`);
  const excluded = new Set(completed);
  const unique = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return [...unique.values()].filter((candidate) => !excluded.has(candidate.id)).slice(0, limit);
}

function imagePrompt(candidate) {
  const presentation = PRESENTATIONS[candidate.template];
  if (!presentation)
    throw new Error(`Tipo culinário inválido: ${candidate.template}; esperado tipo do checklist.`);
  return [
    "Use case: photorealistic-natural. Asset type: illustrative meal photograph for a nutrition recipe catalog.",
    `Primary request: a realistic appetizing serving containing ONLY these named catalog foods (names in Brazilian Portuguese): ${candidate.ingredients.join("; ")}.`,
    presentation,
    "Respect the named food varieties and preparation states: cozido means boiled/cooked, grelhado grilled, assado roasted, cru raw, sem pele means SKINLESS with all skin removed before cooking. Keep raw vegetables raw. Meat, fish, seafood and egg whites must be fully cooked. Skinless chicken must show bare cooked meat fibers, never a golden skin sheet. Whole boiled eggs have firm yolks. Tofu and seitan are ready to eat. Tapioca goma is prepared as a white cassava crepe; it is not raw powder or a wheat pancake. Supplement powders are mixed into the named liquid, never served as loose powder.",
    "Do not invent sauces, herbs, toppings, other fruit or any ingredient that was not named. Whole prepared foods such as bread, pancakes, cheese bread, hummus and granola retain their normal appearance. Remove fruit peels, pits or cores that would not be eaten; do not add ingredient props beside the serving.",
    "Variety details when named: Ameixa means fresh juicy plum wedges with smooth purple-red skin and golden flesh, not dried wrinkled prunes; batata baroa is yellow arracacha (mandioquinha), not fibrous cassava; cuscuz marroquino is fine fluffy wheat couscous, not large pearl couscous; edamame is cooked shelled green soybeans, no inedible pods; feijao means the named bean variety, not lentils or chickpeas. Atum fresco grelhado is fully cooked grilled tuna: opaque beige-tan flaky muscle chunks with browned edges, no pink or red center, no rare sliced steaks. Frango coxa sem pele is skinless roasted thigh muscle: serve small irregular shredded fibrous pieces with matte beige flesh and very light browning on a few tips. No intact drumsticks or whole thighs, no glossy orange-brown surface sheets or crust, no skin layered over the meat.",
    "Style: realistic editorial food photography with natural food textures. Composition: square 1:1 overhead view, entire vessel fully visible and centered, neutral warm light-gray tabletop, soft natural daylight and gentle realistic shadows.",
    "Constraints: single photo, no collage, no people, hands, packaging, utensils, straws, text, logos or watermark. This is an illustrative photo, not an exact portion measurement.",
  ].join(" ");
}

/** Persiste lote retomável e seus prompts, sem marcar imagens como concluídas. @example await queueImageBatch(8) */
export async function queueImageBatch(limit = 8) {
  const candidates = buildMealCandidates(await loadPublicFoods());
  const ledger = await loadProductionLedger();
  const selected = selectImageBatch(
    candidates,
    ledger.completed.map((entry) => entry.candidateId),
    limit,
  );
  if (!selected.length) return { remaining: 0, batchFile: null };
  const files = await readdir(productionRoot);
  const sequence = files.filter((filename) => /^batch-\d{5}\.json$/.test(filename)).length + 1;
  const batchFile = join(productionRoot, `batch-${String(sequence).padStart(5, "0")}.json`);
  const items = selected.map((candidate) => ({
    candidateId: candidate.id,
    title: candidate.title,
    prompt: imagePrompt(candidate),
  }));
  await writeFile(
    batchFile,
    `${JSON.stringify({ version: 1, generator: "imagegen", items }, null, 2)}\n`,
    { flag: "wx" },
  );
  return {
    remaining: candidates.length - ledger.completed.length,
    batchFile,
    images: items.length,
  };
}
