#!/usr/bin/env node
/**
 * sync-env.js
 *
 * Lê o arquivo .env.<environment> na raiz do monorepo e gera os arquivos
 * de cada projeto com os prefixos corretos de cada plataforma.
 *
 * Uso:
 *   npm run env:sync              → usa .env.development por padrão
 *   npm run env:sync -- preview   → usa .env.preview
 *   npm run env:sync -- production → usa .env.production
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const env = process.argv[2] || "development";
const sourceFile = path.join(ROOT, `.env.${env}`);

if (!fs.existsSync(sourceFile)) {
  console.error(`Arquivo não encontrado: ${sourceFile}`);
  console.error(`Crie o arquivo copiando .env.example:\n  cp .env.example .env.${env}`);
  process.exit(1);
}

// Lê e parseia o arquivo fonte
const raw = fs.readFileSync(sourceFile, "utf8");
const vars = {};
for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  if (key) vars[key.trim()] = rest.join("=").trim();
}

// ─── Mapeamento por plataforma ─────────────────────────────────────────────

const appEnvMap = {
  SUPABASE_URL: "EXPO_PUBLIC_SUPABASE_URL",
  SUPABASE_ANON_KEY: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  API_URL: "EXPO_PUBLIC_API_URL", // base do BFF no web — sem ela as features de IA quebram
  // DATABASE_URL não vai pro app — é só para migrations
  // Nenhuma chave de provedor de IA vai pro mobile: EXPO_PUBLIC_* entra no
  // bundle e é extraível. Toda IA passa pelo BFF (ADR-004).
};

const webEnvMap = {
  SUPABASE_URL: "NEXT_PUBLIC_SUPABASE_URL",
  SUPABASE_ANON_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "SUPABASE_SERVICE_ROLE_KEY", // server-side only, sem prefixo NEXT_PUBLIC_
  DATABASE_URL: "DATABASE_URL",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY", // server-side only — usada por todas as rotas /api/ai/*
};

// ─── Geração dos arquivos ──────────────────────────────────────────────────

function buildEnvFile(varMap, extras = {}) {
  const lines = [
    `# Gerado automaticamente por scripts/sync-env.js`,
    `# Fonte: .env.${env} — NÃO edite este arquivo diretamente`,
    "",
  ];
  for (const [src, dest] of Object.entries(varMap)) {
    if (vars[src] !== undefined) {
      lines.push(`${dest}=${vars[src]}`);
    }
  }
  for (const [key, value] of Object.entries(extras)) {
    lines.push(`${key}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

// app/.env.<environment>
const appFile = path.join(ROOT, "app", `.env.${env}`);
const appContent = buildEnvFile(appEnvMap, { EXPO_PUBLIC_APP_ENV: env });
fs.writeFileSync(appFile, appContent);
console.log(`✓ ${path.relative(ROOT, appFile)}`);

// web/.env.local — precedência maior que .env no Next. Escrever em .env deixaria
// um .env.local existente vencer, e o sync rodaria "com sucesso" sem efeito.
const webFile = path.join(ROOT, "web", ".env.local");
const webContent = buildEnvFile(webEnvMap);
fs.writeFileSync(webFile, webContent);
console.log(`✓ ${path.relative(ROOT, webFile)}`);

console.log(`\nAmbiente: ${env} — sincronizado com sucesso.`);
