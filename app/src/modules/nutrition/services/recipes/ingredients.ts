import type { ItemDoPrato } from '../consumoDoDia';
import type { FoodFamily, FoodState, RecipeIngredient } from './types';

const FAMILY_PATTERNS: readonly [FoodFamily, RegExp][] = [
  ['sweet_potato', /\bbatata[ -]doce\b/],
  ['olive_oil', /\bazeite de oliva\b/],
  ['chicken', /\bfrango\b/],
  ['beef', /\b(patinho|alcatra|coxao|carne bovina|carne de boi)\b/],
  ['fish', /\b(tilapia|merluza|pescada|peixe)\b/],
  ['apple', /\bmaca\b/],
  ['banana', /\bbanana\b/],
  ['egg', /\bovos?\b/],
  ['bread', /\bpao\b.*\bintegral\b/],
  ['coffee', /\bcafe\b/],
  ['oats', /\baveia\b/],
  ['yogurt', /\biogurte\b/],
  ['rice', /\barroz\b/],
  ['beans', /\bfeijao\b/],
  ['whey', /\bwhey\b/],
  ['vegetable', /\b(brocolis|cenoura|legumes|abobrinha|abobora|couve|salada|alface|tomate)\b/],
];
const READY_FAMILIES: readonly FoodFamily[] = [
  'apple',
  'banana',
  'bread',
  'coffee',
  'oats',
  'yogurt',
  'whey',
  'olive_oil',
];
const UNIT_NAMES: Readonly<Record<string, string>> = {
  unidade: 'un',
  unidades: 'un',
  fatia: 'fatias',
  gramas: 'g',
  grama: 'g',
};
const UNIT_OPTIONS: Partial<Record<FoodFamily, readonly string[]>> = {
  egg: ['g', 'un'],
  bread: ['g', 'un', 'fatias'],
  apple: ['g', 'un'],
  banana: ['g', 'un'],
  yogurt: ['g', 'ml', 'un', 'pote'],
  coffee: ['ml', 'xicara'],
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function foodState(name: string, family: FoodFamily): FoodState {
  if (/\b(cozid[oa]s?|assad[oa]s?|grelhad[oa]s?)\b/.test(name)) return 'cooked';
  if (/\b(cru|crua|crus|cruas)\b/.test(name)) return 'raw';
  if (READY_FAMILIES.includes(family)) return 'ready';
  return 'unknown';
}

function reasonablePortion(family: FoodFamily, quantity: number, unit: string): boolean {
  if (!(UNIT_OPTIONS[family] ?? ['g']).includes(unit)) return false;
  if (!Number.isFinite(quantity) || quantity <= 0) return false;
  if (['un', 'fatias', 'pote', 'xicara'].includes(unit)) return quantity <= 6;
  return quantity <= 1000;
}

/** Não reconhece prato composto como se fosse um ingrediente simples. */
export function recipeIngredient(item: ItemDoPrato): RecipeIngredient | null {
  if (!item || typeof item.id !== 'string' || typeof item.food?.name !== 'string') return null;
  if (item.unit != null && typeof item.unit !== 'string') return null;
  const name = item.food?.name ?? '';
  const normalized = normalize(name);
  if (
    /\b(com|empanad[oa]|rechead[oa]|molho|sanduiche|vitamina|mingau|mistura|sopa|frit[oa]|codorna|farinha|passa|desidratad[oa]|chips|suco|pure)\b/.test(
      normalized
    )
  )
    return null;
  const family = FAMILY_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0];
  if (family !== 'whey' && /\b(po|granulad[oa]|instantaneo)\b/.test(normalized)) return null;
  if (family === 'banana' && /\b(verde|cozid[oa]|assad[oa])\b/.test(normalized)) return null;
  const rawUnit = normalize(item.unit ?? item.food?.serving_unit ?? '');
  const unit = UNIT_NAMES[rawUnit] ?? rawUnit;
  const quantity = Number(item.quantity);
  if (!family || !reasonablePortion(family, quantity, unit)) return null;
  const state = foodState(normalized, family);
  if (READY_FAMILIES.includes(family) && state !== 'ready') return null;
  return {
    id: item.id,
    name,
    family,
    state,
    quantity,
    unit,
    label: `${quantity} ${unit} de ${name}`,
  };
}
