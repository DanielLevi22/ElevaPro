import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createImageKitStore } from "../web/src/modules/nutrition/services/media/imagekit.mjs";
import { buildMealCandidates } from "./meal-catalog/candidates.mjs";
import {
  loadProductionLedger,
  loadPublicFoods,
  productionRoot,
  writeMealChecklist,
} from "./meal-catalog/checklist.mjs";
import { publishCandidateImage } from "./meal-catalog/production.mjs";
import { queueImageBatch } from "./meal-catalog/queue.mjs";

const [operation, candidateId, filename, promptFile] = process.argv.slice(2);

async function publish() {
  const candidate = buildMealCandidates(await loadPublicFoods()).find(
    (option) => option.id === candidateId,
  );
  if (!candidate || !filename)
    throw new Error("Publicação inválida: esperado ID do checklist e arquivo JPEG.");
  const ledger = await loadProductionLedger();
  if (ledger.completed.some((entry) => entry.candidateId === candidateId))
    throw new Error("Imagem concluída: para substituir, crie nova versão explícita.");
  process.loadEnvFile(new URL("../web/.env.local", import.meta.url));
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint || !process.env.IMAGEKIT_PRIVATE_KEY)
    throw new Error("ImageKit indisponível: esperado endpoint e chave no servidor.");
  const completed = await publishCandidateImage(
    candidate,
    await readFile(filename),
    createImageKitStore(endpoint, process.env.IMAGEKIT_PRIVATE_KEY),
  );
  const prompt = promptFile ? await readFile(promptFile, "utf8") : undefined;
  ledger.completed.push({
    ...completed,
    title: candidate.title,
    ingredients: candidate.ingredients,
    prompt,
    generator: "imagegen",
    url: `${endpoint.replace(/\/$/, "")}/${completed.asset.path}`,
  });
  await mkdir(productionRoot, { recursive: true });
  await writeFile(join(productionRoot, "production.json"), `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(JSON.stringify(await writeMealChecklist()));
}

async function main() {
  if (operation === "queue") {
    console.log(JSON.stringify(await queueImageBatch(Number(candidateId ?? 8))));
    return;
  }
  if (operation === "checklist") {
    console.log(JSON.stringify(await writeMealChecklist()));
    return;
  }
  if (operation === "publish") {
    await publish();
    return;
  }
  throw new Error(
    "Uso esperado: node scripts/meal-catalog.mjs <checklist|queue TAMANHO|publish ID arquivo.jpg>.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
