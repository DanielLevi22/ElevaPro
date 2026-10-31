import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";
import { getMealRecipeCatalog } from "../MealCatalogService";
import { clearPublishedMealDishesCache, loadPublishedMealDishes } from "../MealDishCatalogService";

const RICE = "11111111-1111-4111-8111-111111111111";
const BEANS = "22222222-2222-4222-8222-222222222222";
const ROWS = [
  {
    id: "candidate-0000000000000001",
    title: "Prato: Arroz + Feijão",
    image: {
      storage_path: "meal-images/photo-candidate-0000000000000001-v1-abc.jpg",
      delivery_base_url: "https://ik.imagekit.io/conta/",
    },
    ingredients: [
      { food_id: BEANS, order_index: 1 },
      { food_id: RICE, order_index: 0 },
    ],
  },
];

function fakeClient(rows: unknown[]) {
  const range = vi.fn(() => ({ returns: () => Promise.resolve({ data: rows, error: null }) }));
  const query = { select: () => query, eq: () => query, order: () => query, range };
  return { client: { from: () => query } as unknown as SupabaseClient, range };
}

beforeEach(() => clearPublishedMealDishesCache());

it("entrega o prato publicado com a foto da origem registrada e os alimentos em ordem", async () => {
  const { client } = fakeClient(ROWS);
  await expect(loadPublishedMealDishes(client)).resolves.toEqual([
    {
      id: "candidate-0000000000000001",
      title: "Prato: Arroz + Feijão",
      imageUrl:
        "https://ik.imagekit.io/conta/meal-images/photo-candidate-0000000000000001-v1-abc.jpg",
      foodIds: [RICE, BEANS],
    },
  ]);
});

it("troca a origem das fotos pela base configurada no servidor", async () => {
  const { client } = fakeClient(ROWS);
  const [dish] = await loadPublishedMealDishes(client, "https://cdn.example.test/fotos");
  expect(dish.imageUrl).toBe(
    "https://cdn.example.test/fotos/meal-images/photo-candidate-0000000000000001-v1-abc.jpg",
  );
});

it("descarta prato sem foto ou sem ingrediente em vez de sugerir algo incompleto", async () => {
  const { client } = fakeClient([
    { ...ROWS[0], image: null },
    { ...ROWS[0], id: "candidate-0000000000000002", ingredients: [] },
  ]);
  await expect(loadPublishedMealDishes(client)).resolves.toEqual([]);
});

it("reaproveita o catálogo dentro da janela de cache e relê depois dela", async () => {
  const { client, range } = fakeClient(ROWS);
  await loadPublishedMealDishes(client, "/", 0);
  await loadPublishedMealDishes(client, "/", 60_000);
  expect(range).toHaveBeenCalledTimes(1);
  await loadPublishedMealDishes(client, "/", 11 * 60_000);
  expect(range).toHaveBeenCalledTimes(2);
});

it("o contrato entregue ao aparelho leva os pratos importados ao lado dos fixos", async () => {
  const { client } = fakeClient(ROWS);
  const catalog = getMealRecipeCatalog("/", await loadPublishedMealDishes(client));
  expect(catalog.recipes.length).toBeGreaterThan(0);
  expect(catalog.dishes.map((dish) => dish.foodIds)).toEqual([[RICE, BEANS]]);
});

it("recusa prato cuja foto não é HTTPS em vez de entregar endereço inseguro", () => {
  const dish = {
    id: "candidate-x",
    title: "Prato",
    imageUrl: "http://x.test/a.jpg",
    foodIds: [RICE],
  };
  expect(() => getMealRecipeCatalog("/", [dish])).toThrow("Catálogo inválido");
});
