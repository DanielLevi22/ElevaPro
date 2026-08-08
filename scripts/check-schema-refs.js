#!/usr/bin/env node
/**
 * check-schema-refs.js
 *
 * Falha se algum `.from('tabela')` no código apontar para tabela que não
 * existe no schema Drizzle.
 *
 * Existe porque nome de tabela é string: nem o TypeScript nem os testes
 * acusam a divergência, e os testes ainda mockam o Supabase. O sintoma
 * aparece só em runtime — às vezes nem lá, quando a chamada descarta o
 * resultado sem checar erro.
 *
 * Compara com `shared/src/database/schema/`, não com o banco: o CI não tem
 * credencial, e o schema versionado é a fonte da verdade. Divergir dele é o
 * defeito, mesmo que algum ambiente concorde com o código.
 *
 * Uso: npm run db:check-refs
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "shared/src/database/schema");
const SCAN_DIRS = ["app/src", "web/src"];
const SOURCE_EXT = new Set([".ts", ".tsx"]);

// Tabelas do schema `auth` do Supabase — existem no banco, não no Drizzle.
const EXTERNAL_TABLES = new Set(["users"]);

// ── Coleta as tabelas declaradas no schema ──────────────────────────────────

function collectSchemaTables() {
  const tables = new Set(EXTERNAL_TABLES);
  for (const file of fs.readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith(".ts")) continue;
    const content = fs.readFileSync(path.join(SCHEMA_DIR, file), "utf8");
    for (const match of content.matchAll(/pgTable\(\s*["']([a-z0-9_]+)["']/g)) {
      tables.add(match[1]);
    }
  }
  return tables;
}

// ── Varre o código por referências ──────────────────────────────────────────

function* walkSources(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walkSources(full);
    } else if (SOURCE_EXT.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

/** Exige `.from(` com string literal snake_case — evita casar com Array.from. */
const TABLE_REF = /\.from\(\s*["']([a-z][a-z0-9_]*)["']/g;

function collectReferences() {
  const refs = [];
  for (const scanDir of SCAN_DIRS) {
    const absolute = path.join(ROOT, scanDir);
    if (!fs.existsSync(absolute)) continue;

    for (const file of walkSources(absolute)) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(TABLE_REF)) {
          refs.push({
            table: match[1],
            file: path.relative(ROOT, file).replace(/\\/g, "/"),
            line: index + 1,
          });
        }
      });
    }
  }
  return refs;
}

// ── Resultado ───────────────────────────────────────────────────────────────

const schemaTables = collectSchemaTables();
const orphans = collectReferences().filter((ref) => !schemaTables.has(ref.table));

if (orphans.length === 0) {
  console.log(
    `✓ Todas as referências apontam para tabelas do schema (${schemaTables.size} tabelas).`,
  );
  process.exit(0);
}

const byTable = new Map();
for (const ref of orphans) {
  if (!byTable.has(ref.table)) byTable.set(ref.table, []);
  byTable.get(ref.table).push(ref);
}

console.error(`\n❌  ${orphans.length} referência(s) a tabela inexistente no schema:\n`);
for (const [table, occurrences] of [...byTable].sort()) {
  console.error(`    ${table}`);
  for (const ref of occurrences) {
    console.error(`      ${ref.file}:${ref.line}`);
  }
  console.error("");
}
console.error("    O schema vive em shared/src/database/schema/.");
console.error("    Se a tabela deveria existir, crie a migration — não o inverso.\n");
process.exit(1);
