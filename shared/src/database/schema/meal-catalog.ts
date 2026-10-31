import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { dietMeals, foods } from "./nutrition";

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  version: integer("version").notNull(),
  storage_path: text("storage_path").notNull().unique(),
  delivery_base_url: text("delivery_base_url").notNull(),
  content_type: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  sha256: text("sha256").notNull(),
  verified_at: timestamp("verified_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mealDishes = pgTable(
  "meal_dishes",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    template: text("template").notNull(),
    status: text("status").notNull().default("draft"),
    image_id: text("image_id").references(() => mediaAssets.id, { onDelete: "restrict" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("meal_dishes_image_id_idx").on(table.image_id),
    index("meal_dishes_status_id_idx").on(table.status, table.id),
  ],
);

export const mealDishIngredients = pgTable(
  "meal_dish_ingredients",
  {
    dish_id: text("dish_id")
      .notNull()
      .references(() => mealDishes.id, { onDelete: "cascade" }),
    food_id: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    order_index: integer("order_index").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.dish_id, table.food_id] }),
    unique("meal_dish_ingredients_dish_id_order_index_key").on(table.dish_id, table.order_index),
    index("meal_dish_ingredients_food_id_idx").on(table.food_id, table.dish_id),
  ],
);

export const mealDishPreparations = pgTable(
  "meal_dish_preparations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dish_id: text("dish_id")
      .notNull()
      .references(() => mealDishes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    minutes: integer("minutes").notNull(),
    equipment: text("equipment").notNull(),
    steps: jsonb("steps").$type<{ instruction: string; timerSeconds?: number }[]>().notNull(),
  },
  (table) => [index("meal_dish_preparations_dish_id_idx").on(table.dish_id)],
);

export const dietMealDishes = pgTable(
  "diet_meal_dishes",
  {
    diet_meal_id: uuid("diet_meal_id")
      .notNull()
      .references(() => dietMeals.id, { onDelete: "cascade" }),
    dish_id: text("dish_id")
      .notNull()
      .references(() => mealDishes.id, { onDelete: "restrict" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.diet_meal_id, table.dish_id] }),
    index("diet_meal_dishes_dish_id_idx").on(table.dish_id),
  ],
);
