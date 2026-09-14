#!/usr/bin/env node
/**
 * check-column-refs.js
 *
 * Compara as colunas pedidas em `.select("...")` com as colunas reais do
 * schema Drizzle, e falha quando alguma não existe.
 *
 * Existe porque este é o defeito mais repetido do projeto, e o mais silencioso:
 * o PostgREST recusa a consulta inteira com 42703, o código descarta o `error`,
 * e a tela mostra "sem dados" em vez de erro. Já aconteceu em
 * `physical_assessments` (27 colunas pedidas, 2 existiam), em
 * `student_anamnesis` (`updated_at`), em `profiles` (`is_super_admin`,
 * `last_login_at`, `invite_code`, `weight`) e em `body_scans`.
 *
 * Nenhum desses casos foi pego por tipo, lint ou teste — só por alguém abrir a
 * tela e estranhar. Esta guarda é o que transforma isso em erro de CI.
 *
 * Limitação consciente: só entende `.from("tabela")` seguido de `.select("...")`
 * com string literal. Select dinâmico ou `*` passa direto — é a fatia que dá
 * para verificar sem interpretar o código.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "shared", "src", "database", "schema");
const FONTES = [
  path.join(ROOT, "web", "src"),
  path.join(ROOT, "app", "src"),
  path.join(ROOT, "shared", "src"),
];

/**
 * Tabelas classificadas como sensíveis pela `LGPD_COMPLIANCE.md` — anamnese,
 * avaliação física, sessões de treino, registro alimentar, métricas diárias,
 * fotos corporais e a água do dia.
 *
 * Nelas `select("*")` é recusado. Não por tráfego: com `*`, a coluna criada
 * amanhã passa a sair do banco no dia em que nasce, para toda camada que já
 * consultava a tabela — sem ninguém decidir que ela deveria sair. Nomear os
 * campos faz expor um dado novo custar uma linha escrita de propósito.
 */
const TABELAS_SENSIVEIS = new Set([
  "physical_assessments",
  "student_anamnesis",
  "workout_sessions",
  "diet_logs",
  "meal_logs",
  "health_daily_metrics",
  "body_scans",
  "hydration_daily",
]);

/** Nome da tabela → colunas, lido do `pgTable(...)` do Drizzle. */
function lerSchema() {
  const tabelas = new Map();

  for (const arquivo of fs.readdirSync(SCHEMA_DIR)) {
    if (!arquivo.endsWith(".ts")) continue;
    const texto = fs.readFileSync(path.join(SCHEMA_DIR, arquivo), "utf8");

    for (const bloco of texto.matchAll(/pgTable\(\s*"([a-z_]+)"\s*,\s*\{([\s\S]*?)\n\}\)/g)) {
      const [, tabela, corpo] = bloco;
      const colunas = new Set();
      // `nome: tipo("nome_no_banco", ...)` — o segundo é o que vale na query.
      for (const col of corpo.matchAll(/\b[a-zA-Z_]+\s*:\s*[a-zA-Z]+\(\s*"([a-z_]+)"/g)) {
        colunas.add(col[1]);
      }
      tabelas.set(tabela, colunas);
    }
  }

  return tabelas;
}

function listarArquivos(dir) {
  const encontrados = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "node_modules") encontrados.push(...listarArquivos(caminho));
    } else if (/\.tsx?$/.test(entrada.name)) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

const tabelas = lerSchema();
if (tabelas.size === 0) {
  console.error("✗ Não consegui ler nenhuma tabela do schema Drizzle.");
  process.exit(1);
}

const problemas = [];
const selectsAbertos = [];

for (const raiz of FONTES) {
  if (!fs.existsSync(raiz)) continue;

  for (const arquivo of listarArquivos(raiz)) {
    const texto = fs.readFileSync(arquivo, "utf8");

    for (const uso of texto.matchAll(
      /\.from\(\s*["']([a-z_]+)["']\s*\)[\s\S]{0,300}?\.select\(\s*[`"']([^`"']+)[`"']/g,
    )) {
      const [, tabela, lista] = uso;

      if (TABELAS_SENSIVEIS.has(tabela) && lista.trim() === "*") {
        selectsAbertos.push({ arquivo: path.relative(ROOT, arquivo), tabela });
      }

      const colunas = tabelas.get(tabela);
      if (!colunas) continue;

      // Selects aninhados — `profiles(full_name, email)` — descrevem colunas
      // de OUTRA tabela. Some com eles antes de dividir, senão cada campo de
      // dentro vira falso positivo na tabela de fora.
      const semAninhados = lista.replace(/[a-z_]+\s*(?:!\w+)?\s*\([^)]*\)/g, "");

      for (const bruto of semAninhados.split(",")) {
        // `alias:coluna` — o que vale é o lado direito.
        const nome = bruto.trim().split(":").pop().trim();
        if (!nome || nome === "*" || nome.includes("(") || nome.includes(")")) continue;

        // Caminho dentro de jsonb — `responses->height`, `responses->>weight`.
        // A coluna é o que vem ANTES da seta; o resto é chave do documento, que
        // nenhum schema declara. Sem esta linha a guarda recusaria exatamente a
        // técnica que a revisão de LGPD exige: extrair no banco os dois campos
        // de que a consulta precisa, em vez de carregar o jsonb inteiro — que
        // em `student_anamnesis` significa trazer lesão e medicação junto.
        const coluna = nome.split("->")[0].trim();
        if (!colunas.has(coluna)) {
          problemas.push({ arquivo: path.relative(ROOT, arquivo), tabela, coluna: nome });
        }
      }
    }

    // Filtros e ordenação também nomeiam colunas, e falham do mesmo jeito.
    // `profiles.last_login_at` escapou da primeira versão desta guarda por
    // estar num `.gte()`, não num `.select()`.
    for (const uso of texto.matchAll(
      // A janela para no próximo `.from(` ou no `;`. Sem isso, consultas
      // encadeadas num `Promise.all` emprestam filtros umas às outras e a
      // guarda acusa coluna certa na tabela errada.
      /\.from\(\s*["']([a-z_]+)["']\s*\)((?:(?!\.from\()[\s\S]){0,400}?);/g,
    )) {
      const [, tabela, corpo] = uso;
      const colunas = tabelas.get(tabela);
      if (!colunas) continue;

      for (const filtro of corpo.matchAll(
        // `(?![^)]*foreignTable)` deixa passar o `.order("x", { foreignTable })`,
        // que ordena por coluna da tabela EMBUTIDA, não da tabela de fora —
        // `workout_exercises.order_index` num select de `workouts`, por exemplo.
        /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*["']([a-z_]+)["'](?![^)]*foreignTable)/g,
      )) {
        const nome = filtro[1];
        if (!colunas.has(nome)) {
          problemas.push({ arquivo: path.relative(ROOT, arquivo), tabela, coluna: nome });
        }
      }
    }
  }
}

if (problemas.length > 0) {
  console.error("\n✗ Consulta pedindo coluna que não existe no schema:\n");
  for (const { arquivo, tabela, coluna } of problemas) {
    console.error(`    ${tabela}.${coluna}`);
    console.error(`      ${arquivo}\n`);
  }
  console.error(
    "  O PostgREST recusa a consulta inteira com 42703. Se o `error` for\n" +
      "  descartado, a tela mostra 'sem dados' e ninguém descobre.\n",
  );
  process.exit(1);
}

if (selectsAbertos.length > 0) {
  console.error('\n✗ `select("*")` em tabela sensível:\n');
  for (const { arquivo, tabela } of selectsAbertos) {
    console.error(`    ${tabela}`);
    console.error(`      ${arquivo}\n`);
  }
  console.error(
    "  Estas tabelas guardam dado de saúde (LGPD_COMPLIANCE.md). Com `*`, a\n" +
      "  coluna criada amanhã sai do banco no dia em que nasce, para toda\n" +
      "  camada que já consultava — sem ninguém decidir que ela deveria sair.\n\n" +
      "  Nomeie os campos. Para `physical_assessments` existe a constante\n" +
      "  PHYSICAL_ASSESSMENT_COLUMNS em @elevapro/shared.\n",
  );
  process.exit(1);
}

console.log(
  `✓ Nenhuma coluna inexistente em consultas, e nenhum select("*") em tabela sensível (${tabelas.size} tabelas).`,
);
