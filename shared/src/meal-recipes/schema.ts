import { z } from "zod";
import { FOOD_FAMILIES, FOOD_STATES } from "./constants";

const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const families = z.array(z.enum(FOOD_FAMILIES)).max(16);
const imageUrl = z
  .string()
  .max(500)
  .refine((value) => value.startsWith("/meal-images/") || /^https:\/\//.test(value));
const image = z.object({
  id: identifier,
  version: z.number().int().positive(),
  path: z.string().max(250),
  bytes: z.number().int().positive().max(3_000_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  url: imageUrl,
});
const recipe = z.object({
  id: identifier,
  imageId: identifier,
  title: z.string().min(1).max(160),
  description: z.string().max(600),
  minutes: z.number().int().positive().max(1440),
  equipment: z.string().min(1).max(200),
  required: families.min(1),
  excluded: families.optional(),
  separate: families.optional(),
  states: z.partialRecord(z.enum(FOOD_FAMILIES), z.enum(FOOD_STATES)).optional(),
  steps: z
    .array(
      z.object({
        instruction: z.string().min(1).max(1000),
        timerSeconds: z.number().int().positive().max(86400).optional(),
      }),
    )
    .min(1)
    .max(50),
});
const dish = z.object({
  id: identifier,
  title: z.string().min(1).max(240),
  imageUrl,
  foodIds: z.array(z.guid()).min(1).max(16),
});
export const mealRecipeCatalogSchema = z.object({
  version: z.literal(1),
  recipes: z.array(recipe).max(500),
  images: z.array(image).max(500),
  // Opcional no contrato: aparelho antigo descarta a chave, e servidor antigo
  // ainda responde sem ela.
  dishes: z.array(dish).max(25_000).default([]),
});
