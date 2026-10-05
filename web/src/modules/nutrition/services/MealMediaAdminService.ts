import type { MealImageManifest } from "@elevapro/shared";
import { getMealRecipeCatalog } from "./MealCatalogService";
import { exportMealMediaBundle, restoreMealMediaBundle } from "./media/archive.mjs";
import { createImageKitStore } from "./media/imagekit.mjs";
import { validateManifest } from "./media/manifest.mjs";
import seedManifest from "./recipes/mediaManifest.json";

/** Expõe apenas catálogo e disponibilidade dos destinos. @example getMealMediaOverview() */
export function getMealMediaOverview() {
  return {
    catalog: getMealRecipeCatalog(process.env.MEAL_MEDIA_BASE_URL || "/"),
    delivery: process.env.MEAL_MEDIA_BASE_URL ? "external" : "unconfigured",
    destinations: {
      imagekit: !!(process.env.IMAGEKIT_URL_ENDPOINT && process.env.IMAGEKIT_PRIVATE_KEY),
    },
  };
}

/** Baixa originais com conferência de integridade. @example await exportCatalogMedia() */
export async function exportCatalogMedia() {
  if (!process.env.MEAL_MEDIA_BASE_URL)
    throw new Error("Origem indisponível: esperado MEAL_MEDIA_BASE_URL configurado no servidor.");
  const source = createImageKitStore(process.env.MEAL_MEDIA_BASE_URL);
  const bundle = await exportMealMediaBundle(validateManifest(seedManifest), source);
  if (JSON.stringify(bundle).length > 3_000_000)
    throw new Error(
      "Backup grande: esperado até 3 MB nesta versão; use a ferramenta de exportação por diretório.",
    );
  return bundle;
}

/** Restaura somente versões cadastradas, sem trocar a entrega ativa. @example restoreCatalogMedia(backup, 'imagekit') */
export async function restoreCatalogMedia(
  input: unknown,
  destination: string,
): Promise<MealImageManifest> {
  if (!input || typeof input !== "object" || !("manifest" in input))
    throw new Error("Backup inválido: esperado manifesto e originais.");
  const manifest = validateManifest(input.manifest);
  const registered = validateManifest(seedManifest).assets;
  if (
    !manifest.assets.length ||
    manifest.assets.some(
      (asset) => !registered.some((known) => JSON.stringify(known) === JSON.stringify(asset)),
    )
  )
    throw new Error("Backup incompatível: esperado imagens e versões do catálogo atual.");
  const store = destinationStore(destination);
  return restoreMealMediaBundle(input as Parameters<typeof restoreMealMediaBundle>[0], store);
}

function destinationStore(destination: string) {
  if (
    destination === "imagekit" &&
    process.env.IMAGEKIT_URL_ENDPOINT &&
    process.env.IMAGEKIT_PRIVATE_KEY
  )
    return createImageKitStore(process.env.IMAGEKIT_URL_ENDPOINT, process.env.IMAGEKIT_PRIVATE_KEY);
  throw new Error(
    `Destino indisponível: ${destination}; esperado destino configurado no servidor.`,
  );
}
