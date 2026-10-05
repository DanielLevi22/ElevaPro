import { describe, expect, it, vi } from "vitest";
import { getMealRecipeCatalog } from "../MealCatalogService";
import {
  exportCatalogMedia,
  getMealMediaOverview,
  restoreCatalogMedia,
} from "../MealMediaAdminService";

describe("portabilidade do catálogo pelo serviço administrativo", () => {
  it("troca o provedor sem alterar pratos, identidade ou versão das fotos", () => {
    const original = getMealRecipeCatalog("https://first.example.test/catalog");
    const migrated = getMealRecipeCatalog("https://second.example.test/assets");
    expect(migrated.recipes).toEqual(original.recipes);
    expect(migrated.images.map(({ url: _url, ...asset }) => asset)).toEqual(
      original.images.map(({ url: _url, ...asset }) => asset),
    );
    expect(
      migrated.images.every(({ url }) => url.startsWith("https://second.example.test/assets/")),
    ).toBe(true);
  });

  it("expõe as 16 imagens diretamente na pasta do catálogo", () => {
    const overview = getMealMediaOverview();
    expect(overview.catalog.recipes).toHaveLength(16);
    expect(
      overview.catalog.images.every(({ path }) => /^meal-images\/[^/]+\.jpg$/.test(path)),
    ).toBe(true);
    expect(overview.destinations).not.toHaveProperty("local");
    expect(JSON.stringify(overview)).not.toContain("privateKey");
  });

  it("não exporta de arquivos locais quando falta a origem externa", async () => {
    vi.stubEnv("MEAL_MEDIA_BASE_URL", "");
    try {
      await expect(exportCatalogMedia()).rejects.toThrow("Origem indisponível");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("não recria arquivos no app por restauração local", async () => {
    const images = getMealRecipeCatalog().images;
    const backup = {
      manifest: { version: 1, assets: images.map(({ url: _url, ...asset }) => asset) },
      files: {},
    };
    await expect(restoreCatalogMedia(backup, "local")).rejects.toThrow("Destino indisponível");
  });
});
