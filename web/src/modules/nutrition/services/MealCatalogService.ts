import { type MealRecipeCatalog, parseMealRecipeCatalog } from "@elevapro/shared";
import recipes from "./recipes/catalog.json";
import manifest from "./recipes/mediaManifest.json";

/** Resolve fotos por ID próprio sem expor configuração privada. @example getMealRecipeCatalog(base) */
export function getMealRecipeCatalog(base = "/"): MealRecipeCatalog {
  if (base !== "/") {
    const endpoint = new URL(base);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    )
      throw new Error(
        "Base de imagens inválida: esperado HTTPS sem credenciais, query ou fragmento.",
      );
  }
  const normalized = `${base.replace(/\/$/, "")}/`;
  return parseMealRecipeCatalog({
    version: 1,
    recipes,
    images: manifest.assets.map((asset) => ({ ...asset, url: `${normalized}${asset.path}` })),
  });
}
