import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createImageKitStore } from "../web/src/modules/nutrition/services/media/imagekit.mjs";
import { exportMealMedia, restoreMealMedia } from "./meal-media/index.mjs";
import { exportMealMediaPage } from "./meal-media/pagination.mjs";

const [operation, directory, provider = "imagekit", offset, limit = "500"] = process.argv.slice(2);
const manifestFile = new URL(
  "../web/src/modules/nutrition/services/recipes/mediaManifest.json",
  import.meta.url,
);

async function publishedManifest() {
  const active = JSON.parse(await readFile(manifestFile, "utf8"));
  const assets = new Map(active.assets.map((asset) => [asset.id, asset]));
  try {
    const ledger = JSON.parse(
      await readFile(
        new URL("../docs/catalog/meal-combinations/production.json", import.meta.url),
        "utf8",
      ),
    );
    for (const entry of ledger.completed)
      if (!assets.has(entry.asset.id)) assets.set(entry.asset.id, entry.asset);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return { version: 1, assets: [...assets.values()] };
}

/** CLI de backup portátil, sem excluir a origem. @example node scripts/meal-media.mjs export ./backup */
async function main() {
  if (
    !["export", "restore"].includes(operation) ||
    !directory ||
    provider !== "imagekit" ||
    (operation === "restore" && offset !== undefined)
  )
    throw new Error(
      "Uso esperado: node scripts/meal-media.mjs <export|restore> <diretório> [imagekit] [início tamanho-até-500 (somente export)].",
    );
  try {
    process.loadEnvFile(fileURLToPath(new URL("../web/.env.local", import.meta.url)));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const store = createImageKitStore(
    process.env.IMAGEKIT_URL_ENDPOINT ?? "",
    process.env.IMAGEKIT_PRIVATE_KEY ?? "",
  );
  const manifest =
    operation === "export"
      ? await exportPublishedMedia(store)
      : await restoreMealMedia(directory, store);
  console.log(
    JSON.stringify({ operation, provider, images: manifest.assets.length, integrity: "verified" }),
  );
}

/** @param {import('../web/src/modules/nutrition/services/media/archive.mjs').MediaStore} store */
async function exportPublishedMedia(store) {
  const catalog = await publishedManifest();
  if (offset !== undefined)
    return exportMealMediaPage(catalog, store, directory, Number(offset), Number(limit));
  if (catalog.assets.length > 500)
    throw new Error(
      `Catálogo com ${catalog.assets.length} imagens; exporte partes de até 500: export <diretório> imagekit <início> 500.`,
    );
  return exportMealMedia(catalog, store, directory);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
