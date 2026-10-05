import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMealCandidates, MEAL_TEMPLATE_TITLES, uncoveredFoods } from "./candidates.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
export const productionRoot = resolve(root, "docs/catalog/meal-combinations");

/** Carrega apenas o snapshot público, sem consultar planos ou usuários. @example loadPublicFoods() */
export async function loadPublicFoods() {
  const lines = await readFile(new URL("./public-foods.jsonl", import.meta.url), "utf8");
  return lines
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

/** Lê o estado esparso; pendentes não viram milhares de gravações. @example loadProductionLedger() */
export async function loadProductionLedger() {
  try {
    return JSON.parse(await readFile(join(productionRoot, "production.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { version: 1, completed: [] };
  }
}

/** Materializa checklists paginados de todos os candidatos das regras atuais. @example writeMealChecklist() */
export async function writeMealChecklist() {
  const foods = await loadPublicFoods();
  const candidates = buildMealCandidates(foods);
  const ledger = await loadProductionLedger();
  const completed = new Set(ledger.completed.map((entry) => entry.candidateId));
  await mkdir(productionRoot, { recursive: true });
  const groups = new Map();
  for (const option of candidates) {
    if (!groups.has(option.template)) groups.set(option.template, []);
    groups.get(option.template).push(option);
  }
  const index = await writeCandidatePages(groups, completed);
  const uncovered = uncoveredFoods(foods, candidates);
  await writeFile(
    join(productionRoot, "README.md"),
    checklistSummary(foods, candidates, ledger, index, uncovered),
  );
  return {
    foods: foods.length,
    candidates: candidates.length,
    completed: completed.size,
    uncovered: uncovered.map((food) => food.name),
  };
}

async function writeCandidatePages(groups, completed) {
  const index = [];
  for (const [template, options] of groups) {
    for (let offset = 0; offset < options.length; offset += 250) {
      const filename = `${template}-${String(offset / 250 + 1).padStart(3, "0")}.md`;
      const rows = options
        .slice(offset, offset + 250)
        .map(
          (option) =>
            `- [${completed.has(option.id) ? "x" : " "}] \`${option.id}\` — ${option.title}`,
        );
      await writeFile(
        join(productionRoot, filename),
        `# ${MEAL_TEMPLATE_TITLES[template]} — imagens\n\n${rows.join("\n")}\n`,
      );
      index.push(
        `- [${MEAL_TEMPLATE_TITLES[template]}, página ${offset / 250 + 1}](./${filename}) — ${rows.length} combinações`,
      );
    }
  }
  return index;
}

function checklistSummary(foods, candidates, ledger, index, uncovered) {
  return (
    `# Produção de imagens do cardápio — #366\n\n` +
    `Inventário: **${foods.length} alimentos públicos**, consultados no Supabase local em 04/10/2026.\n` +
    `Universo das regras atuais: **${candidates.length} candidatos**. Imagens novas concluídas: **${ledger.completed.length}**.\n\n` +
    `Este é um checklist de produção, não uma prescrição. As combinações são candidatas e precisam de revisão culinária; não garantem adequação nutricional, alergênica ou ao plano. Estados cru/cozido e preparo devem ser confirmados antes de ativar uma receita no app. Não enumera todas as receitas possíveis do mundo ou todas as quantidades.\n\n` +
    `Uma caixa só é marcada após gerar, revisar visualmente, enviar e conferir tamanho/SHA-256 no storage. Ter uma foto não aprova ou ativa a receita. Originais ficam no ImageKit; a fila guarda só metadados e prompts. As 16 fotos do catálogo anterior permanecem no manifesto ativo e não são contadas como novas.\n\n` +
    `Reprodução: \`node scripts/meal-catalog.mjs checklist\`. Ledger: [production.json](./production.json). Regras: [candidates.mjs](../../../scripts/meal-catalog/candidates.mjs).\n\n` +
    `Produção contínua autorizada até concluir a fila. Próximo lote: \`node scripts/meal-catalog.mjs queue 8\`; gera metadados e prompts, sem concluir imagens. O agente usa imagegen para gerar cada foto, revisa, publica via \`publish ID arquivo.jpg prompt.txt\` e remove cópias temporárias somente após a verificação.\n\n` +
    `## Sem combinação nesta versão\n\n${uncovered.map((food) => `- ${food.name} — suplemento isolado; não recebe imagem de prato nesta fase.`).join("\n")}\n\n` +
    `## Checklist por tipo de preparo\n\n${index.join("\n")}\n`
  );
}
