#!/usr/bin/env node
/**
 * check-rls.js
 *
 * Falha se alguma tabela criada pelas migrations não habilitar RLS, ou
 * habilitar sem nenhuma política.
 *
 * Existe porque a auditoria de 2026-08-11 encontrou 18 das 27 tabelas sem RLS
 * num projeto cujo PRD de banco estava marcado como done com a palavra "RLS" na
 * descrição. Estavam expostas as fotos corporais de `body_scans`, as anamneses
 * e o histórico de treino — legíveis por qualquer conta autenticada, porque o
 * isolamento vivia só no `WHERE` da aplicação e o `supabase-js` no navegador
 * fala direto com o PostgREST.
 *
 * Lê as migrations, não o banco: o CI não tem credencial. A limitação é real e
 * está assumida — este script prova que a política EXISTE, nunca que ela está
 * CORRETA. Quem prova o comportamento é `scripts/test-rls-isolation.mjs`, que
 * roda contra um banco de verdade com quatro usuários.
 *
 * Uso: npm run db:check-rls
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

/** Tabelas fora do nosso controle, criadas por extensão ou pelo próprio Supabase. */
const IGNORED = new Set([]);

function readMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

function collect(sql) {
  const created = new Set();
  const dropped = new Set();
  const rlsEnabled = new Set();
  const withPolicy = new Set();

  const tableName = (schema, table) => `${schema || "public"}.${table}`;

  for (const m of sql.matchAll(
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:"?([a-z0-9_]+)"?\.)?"?([a-z0-9_]+)"?/gi,
  )) {
    created.add(tableName(m[1], m[2]));
  }
  for (const m of sql.matchAll(
    /DROP TABLE\s+(?:IF EXISTS\s+)?(?:"?([a-z0-9_]+)"?\.)?"?([a-z0-9_]+)"?/gi,
  )) {
    dropped.add(tableName(m[1], m[2]));
  }
  for (const m of sql.matchAll(
    /ALTER TABLE\s+(?:ONLY\s+)?(?:"?([a-z0-9_]+)"?\.)?"?([a-z0-9_]+)"?\s+ENABLE ROW LEVEL SECURITY/gi,
  )) {
    rlsEnabled.add(tableName(m[1], m[2]));
  }
  for (const m of sql.matchAll(
    /CREATE POLICY\s+"?[a-z0-9_]+"?\s+ON\s+(?:"?([a-z0-9_]+)"?\.)?"?([a-z0-9_]+)"?/gi,
  )) {
    withPolicy.add(tableName(m[1], m[2]));
  }

  for (const t of dropped) created.delete(t);
  for (const t of IGNORED) created.delete(t);

  return { created, rlsEnabled, withPolicy };
}

function main() {
  const { created, rlsEnabled, withPolicy } = collect(readMigrations());

  const semRls = [...created].filter((t) => !rlsEnabled.has(t)).sort();
  // RLS ligada sem política nenhuma nega tudo, inclusive para o dono do dado —
  // quebra silenciosa que só aparece quando o usuário abre a tela.
  const semPolitica = [...created].filter((t) => rlsEnabled.has(t) && !withPolicy.has(t)).sort();

  if (semRls.length === 0 && semPolitica.length === 0) {
    console.log(`✓ RLS habilitada e com política nas ${created.size} tabelas.`);
    return;
  }

  if (semRls.length > 0) {
    console.error(`\n✗ ${semRls.length} tabela(s) sem RLS:\n`);
    for (const t of semRls) console.error(`   ${t}`);
    console.error(
      "\n   Adicione na migration que cria a tabela:\n" +
        "     ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY;\n" +
        "     CREATE POLICY ... ON <tabela> ...;\n",
    );
  }

  if (semPolitica.length > 0) {
    console.error(`\n✗ ${semPolitica.length} tabela(s) com RLS e sem política:\n`);
    for (const t of semPolitica) console.error(`   ${t}`);
    console.error("\n   RLS sem política nega tudo, inclusive para o dono do dado.\n");
  }

  console.error("   Habilite e crie a política no MESMO arquivo de migration.\n");
  process.exit(1);
}

main();
