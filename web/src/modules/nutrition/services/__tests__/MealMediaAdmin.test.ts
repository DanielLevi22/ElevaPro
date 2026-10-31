import type { Database } from "@elevapro/shared";
import { createClient } from "@supabase/supabase-js";
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

  it("lista imagens hospedadas e títulos do banco, dez por página", async () => {
    const databaseFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "photo-candidate-123",
            version: 1,
            storage_path: "meal-images/photo.jpg",
            delivery_base_url: "https://cdn.example.test/",
            content_type: "image/jpeg",
            bytes: 1234,
            sha256: "a".repeat(64),
            meal_dishes: [{ title: "Arroz com frango" }],
          },
        ]),
        { headers: { "content-range": "10-10/2153" } },
      ),
    );
    const client = createClient<Database>("https://database.example.test", "public-key", {
      global: { fetch: databaseFetch },
    });
    const overview = await getMealMediaOverview(client, 2);
    expect(overview.catalog.images[0].url).toBe("https://cdn.example.test/meal-images/photo.jpg");
    expect(overview.catalog.recipes[0].title).toBe("Arroz com frango");
    expect(overview.totalImages).toBe(2153);
    expect(overview.page).toBe(2);
    const requestedUrl = new URL(databaseFetch.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get("offset")).toBe("10");
    expect(requestedUrl.searchParams.get("limit")).toBe("10");
    expect(overview.destinations).not.toHaveProperty("local");
    expect(JSON.stringify(overview)).not.toContain("privateKey");
  });

  it("não mascara falha do banco mostrando o catálogo estático", async () => {
    const client = createClient<Database>("https://database.example.test", "public-key", {
      global: {
        fetch: vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ message: "relation not found" }), { status: 404 }),
          ),
      },
    });
    await expect(getMealMediaOverview(client)).rejects.toThrow("Catálogo indisponível");
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
