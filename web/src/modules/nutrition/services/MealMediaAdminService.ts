import type { Database, MealImage, MealImageManifest } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealMediaOverview } from "./mealMedia.types";
import { exportMealMediaBundle, restoreMealMediaBundle } from "./media/archive.mjs";
import { createImageKitStore } from "./media/imagekit.mjs";
import { validateManifest } from "./media/manifest.mjs";
import seedManifest from "./recipes/mediaManifest.json";

type CatalogAsset = Omit<
  Database["public"]["Tables"]["media_assets"]["Row"],
  "created_at" | "verified_at"
> & {
  meal_dishes: { title: string }[];
};

const ASSET_FIELDS =
  "id, version, storage_path, delivery_base_url, content_type, bytes, sha256, meal_dishes(title)";

/** Consulta fotos cadastradas sob RLS, dez por página. @example await getMealMediaOverview(client, 2) */
export async function getMealMediaOverview(
  client: SupabaseClient<Database>,
  page = 1,
): Promise<MealMediaOverview> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100_000)
    throw new Error(`Página inválida: ${page}; esperado inteiro entre 1 e 100000.`);
  const { assets, count } = await loadAssetPage(client, page);
  const lastPage = Math.max(1, Math.ceil(count / 10));
  if (page > lastPage) return getMealMediaOverview(client, lastPage);
  return describeAssetPage(assets, count, page);
}

async function loadAssetPage(client: SupabaseClient<Database>, page: number) {
  const offset = (page - 1) * 10;
  const {
    data: assets,
    error,
    count,
  } = await client
    .from("media_assets")
    .select(ASSET_FIELDS, { count: "exact" })
    .order("id")
    .range(offset, offset + 9);
  if (error || !assets || count === null)
    throw new Error(
      "Catálogo indisponível: esperado acesso ao banco com as migrations do catálogo aplicadas.",
    );
  return { assets, count };
}

function describeAssetPage(assets: CatalogAsset[], count: number, page: number): MealMediaOverview {
  return {
    catalog: {
      version: 1,
      images: assets.map(toMealImage),
      recipes: assets.map((asset) => ({
        imageId: asset.id,
        title: asset.meal_dishes[0]?.title ?? asset.id,
      })),
    },
    totalImages: count,
    page,
    pageSize: 10,
    backupImageCount: seedManifest.assets.length,
    delivery: count ? "external" : "unconfigured",
    destinations: {
      imagekit: !!(process.env.IMAGEKIT_URL_ENDPOINT && process.env.IMAGEKIT_PRIVATE_KEY),
    },
  };
}

function toMealImage({
  storage_path,
  delivery_base_url,
  content_type,
  meal_dishes: _dishes,
  ...asset
}: CatalogAsset): MealImage {
  return {
    ...asset,
    path: storage_path,
    contentType: content_type as MealImage["contentType"],
    url: `${delivery_base_url.replace(/\/$/, "")}/${storage_path}`,
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
