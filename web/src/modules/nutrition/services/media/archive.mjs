import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createDirectoryStore } from "./directory.mjs";
import { validateManifest, verifyImage } from "./manifest.mjs";

/** @typedef {import('@elevapro/shared').MealImageManifest} MealImageManifest */
/** @typedef {import('@elevapro/shared').MealImageAsset} MealImageAsset */
/** @typedef {{read: (asset: MealImageAsset) => Promise<Uint8Array>, write: (asset: MealImageAsset, bytes: Uint8Array) => Promise<void>}} MediaStore */
/** @typedef {{manifest: MealImageManifest, files: Record<string, string>}} MealMediaBundle */

/** Exporta originais conferidos e identidade portátil. @example exportMealMedia(manifest, source, directory) */
/** @param {MealImageManifest} manifest @param {MediaStore} source @param {string} directory */
export async function exportMealMedia(manifest, source, directory) {
  const bundle = await exportMealMediaBundle(manifest, source);
  await restoreMealMediaBundle(bundle, createDirectoryStore(directory));
  await writeFile(join(directory, "manifest.json"), JSON.stringify(bundle.manifest, null, 2), {
    flag: "wx",
  });
  return bundle.manifest;
}

/** Restaura backup conferindo todos os arquivos antes de publicar. @example restoreMealMedia(directory, destination) */
/** @param {string} directory @param {MediaStore} destination */
export async function restoreMealMedia(directory, destination) {
  const manifest = validateManifest(
    JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
  );
  return restoreMealMediaBundle(
    await exportMealMediaBundle(manifest, createDirectoryStore(directory)),
    destination,
  );
}

/** Cria backup JSON portátil para download pelo admin. @example exportMealMediaBundle(manifest, source) */
/** @param {MealImageManifest} input @param {MediaStore} source @returns {Promise<MealMediaBundle>} */
export async function exportMealMediaBundle(input, source) {
  const manifest = validateManifest(input);
  const files = /** @type {Record<string, string>} */ ({});
  for (const asset of manifest.assets) {
    const bytes = await source.read(asset);
    verifyImage(asset, bytes);
    files[asset.path] = Buffer.from(bytes).toString("base64");
  }
  return { manifest, files };
}

/** Importa somente um backup íntegro; operação pode ser repetida. @example restoreMealMediaBundle(backup, store) */
/** @param {MealMediaBundle} bundle @param {MediaStore} destination */
export async function restoreMealMediaBundle(bundle, destination) {
  const manifest = validateManifest(bundle?.manifest);
  const originals = manifest.assets.map((asset) => {
    const encoded = bundle.files?.[asset.path];
    if (typeof encoded !== "string")
      throw new Error(`Arquivo ausente: ${asset.id}; esperado original em base64.`);
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.toString("base64") !== encoded) throw new Error(`Base64 inválido: ${asset.id}.`);
    verifyImage(asset, bytes);
    return bytes;
  });
  for (const [index, asset] of manifest.assets.entries()) {
    await destination.write(asset, originals[index]);
    verifyImage(asset, await destination.read(asset));
  }
  return manifest;
}
