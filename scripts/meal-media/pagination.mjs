import { exportMealMedia } from "./index.mjs";

/** Exporta uma parte do catálogo preservando o limite de cada pacote. @example exportMealMediaPage(catalog, store, directory, 500) */
/** @param {import('@elevapro/shared').MealImageManifest} catalog @param {import('../../web/src/modules/nutrition/services/media/archive.mjs').MediaStore} source @param {string} directory @param {number} offset @param {number} limit */
export async function exportMealMediaPage(catalog, source, directory, offset, limit = 500) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= catalog.assets.length)
    throw new Error(
      `Início inválido: ${offset}; esperado inteiro entre 0 e ${catalog.assets.length - 1}.`,
    );
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)
    throw new Error(`Tamanho de parte inválido: ${limit}; esperado inteiro entre 1 e 500.`);
  return exportMealMedia(
    { version: catalog.version, assets: catalog.assets.slice(offset, offset + limit) },
    source,
    directory,
  );
}
