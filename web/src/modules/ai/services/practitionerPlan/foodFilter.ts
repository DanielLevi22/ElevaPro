/**
 * Os alimentos que o plano do Praticante pode usar, dadas as exclusões de O7
 * (#365). A IA só recebe esta lista, e a conferência da saída recusa o que
 * estiver fora dela: "o que a pessoa não come não aparece" é garantia do
 * código, não pedido no prompt.
 *
 * Por nome, e não por categoria: "Bebida de soja" está em laticínio e não tem
 * lactose, "Leite sem lactose" é leite, e "Seitan" é glúten puro. Na dúvida, a
 * lista exclui (o "Pão de queijo" sai do sem-glúten): sobrar alimento é melhor
 * que servir o que a pessoa não come. Provisório até a revisão do CRN.
 */

// A barra de proteína costuma levar whey: sem rótulo, a dúvida exclui.
const LACTOSE =
  /leite|queijo|iogurte|requeij|ricota|cottage|kefir|manteiga|whey|case[ií]na|barra de prote/i;
const LACTOSE_FREE = /sem lactose|bebida de (soja|am[eê]ndoas)/i;
const GLUTEN =
  /p[aã]o|trigo|macarr|torrada|marroquino|seitan|granola|aveia|barra de prote|cevada|centeio/i;
const RED_MEAT =
  /carne (bovina|mo[ií]da|su[ií]na)|f[ií]gado bovino|presunto|lombo|costela|picanha/i;
const FISH = /atum|bacalhau|merluza|pescada|salm[aã]o|sardinha|til[aá]pia|peixe/i;
const EGG = /\bovo\b|clara de ovo|crepioca|albumina/i;
const POULTRY_AND_SEAFOOD = /frango|peru|camar[aã]o|col[aá]geno/i;
const ANIMAL_DERIVED = /\bmel\b|ghee|whey|case[ií]na|albumina|col[aá]geno/i;

const BY_EXCLUSION: Record<string, (name: string) => boolean> = {
  Lactose: (name) => LACTOSE.test(name) && !LACTOSE_FREE.test(name),
  Glúten: (name) => GLUTEN.test(name),
  "Carne vermelha": (name) => RED_MEAT.test(name),
  Peixe: (name) => FISH.test(name),
  Ovo: (name) => EGG.test(name),
};

const vegetarian = (name: string) =>
  RED_MEAT.test(name) || FISH.test(name) || POULTRY_AND_SEAFOOD.test(name);

const BY_STYLE: Record<string, (name: string) => boolean> = {
  Vegetariano: vegetarian,
  Vegano: (name) =>
    vegetarian(name) ||
    EGG.test(name) ||
    ANIMAL_DERIVED.test(name) ||
    // Laticínio é animal com ou sem lactose; as bebidas vegetais ficam.
    (LACTOSE.test(name) && !/bebida de/i.test(name)),
};

/**
 * @example allowedFoodNames(["Leite integral", "Tofu"], { exclusions: ["Lactose"], style: "Onívoro" }) // ["Tofu"]
 */
export function allowedFoodNames(
  names: readonly string[],
  choices: { exclusions: readonly string[]; style: string },
): string[] {
  const rules = [
    ...choices.exclusions.map((item) => BY_EXCLUSION[item]),
    BY_STYLE[choices.style],
  ].filter((rule): rule is (name: string) => boolean => rule !== undefined);
  return names.filter((name) => !rules.some((excludes) => excludes(name)));
}
