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
  // Atravessa o Deployment Protection do preview. Sem ela, toda chamada de IA
  // recebe 302 para o SSO da Vercel. Vazia em produção, que não é protegida.
  // Não é segredo de verdade no mobile: EXPO_PUBLIC_* é inlinada no bundle.
  VERCEL_BYPASS: "EXPO_PUBLIC_VERCEL_BYPASS",
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

// Dentro do emulador Android, 127.0.0.1 é o próprio emulador — não a máquina
// que roda o Supabase. 10.0.2.2 é o alias do loopback do host. Sem esta
// tradução o login falha por timeout enquanto o web, que roda no host, funciona
// com a mesma URL: o mesmo valor significa máquinas diferentes nos dois lados.
// Só se aplica ao app, e só a endereço local — URL de nuvem passa intacta.
const ANDROID_EMULATOR_HOST = "10.0.2.2";

function toEmulatorHost(value) {
  return value.replace(/\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, `//${ANDROID_EMULATOR_HOST}`);
}

function buildEnvFile(varMap, extras = {}, { forAndroidEmulator = false } = {}) {
  const lines = [
    `# Gerado automaticamente por scripts/sync-env.js`,
    `# Fonte: .env.${env} — NÃO edite este arquivo diretamente`,
    "",
  ];
  for (const [src, dest] of Object.entries(varMap)) {
    if (vars[src] !== undefined) {
      const value = forAndroidEmulator ? toEmulatorHost(vars[src]) : vars[src];
      lines.push(`${dest}=${value}`);
    }
  }
  for (const [key, value] of Object.entries(extras)) {
    lines.push(`${key}=${value}`);
  }
  return `${lines.join("\n")}\n`;
}

// app/.env.<environment>
const appFile = path.join(ROOT, "app", `.env.${env}`);
const appContent = buildEnvFile(
  appEnvMap,
  { EXPO_PUBLIC_APP_ENV: env },
  { forAndroidEmulator: true },
);
fs.writeFileSync(appFile, appContent);

// Um endereço de loopback sobrevivendo até aqui significa que o app vai
// procurar o serviço dentro do próprio emulador. O sintoma é login que falha
// por timeout enquanto o web funciona — some da tela, não do log. Falhar aqui
// é a única chance de o erro aparecer antes do aparelho.
const loopbackLeak = appContent
  .split("\n")
  .filter((line) => /^EXPO_PUBLIC_\w+=.*\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/.test(line));

if (loopbackLeak.length > 0) {
  console.error(`\n✗ ${path.relative(ROOT, appFile)} aponta para o loopback:`);
  for (const line of loopbackLeak) console.error(`    ${line}`);
  console.error(
    `\n  Dentro do emulador Android isso é o próprio emulador, não a sua máquina.` +
      `\n  Use ${ANDROID_EMULATOR_HOST} — a tradução deveria ter acontecido em toEmulatorHost().\n`,
  );
  process.exit(1);
}

console.log(`✓ ${path.relative(ROOT, appFile)}`);

// web/.env.local — precedência maior que .env no Next. Escrever em .env deixaria
// um .env.local existente vencer, e o sync rodaria "com sucesso" sem efeito.
const webFile = path.join(ROOT, "web", ".env.local");
const webContent = buildEnvFile(webEnvMap);
fs.writeFileSync(webFile, webContent);
console.log(`✓ ${path.relative(ROOT, webFile)}`);

// ─── Divergência com o environment do EAS ──────────────────────────────────
//
// Este arquivo gera `app/.env.<env>`, e um build LOCAL de release lê daqui. Um
// build no EAS NÃO lê: ele usa as variáveis do environment declarado no perfil
// de `eas.json`. Os dois podem estar diferentes há meses sem que nada avise — e
// o arquivo do repositório é o que a pessoa olha quando vai investigar.
//
// Foi assim que a IA do mobile ficou fora do ar em 2026-08-28. Pior: as
// `EXPO_PUBLIC_*` são inlinadas no bundle em tempo de build, então um valor
// errado não se corrige mudando o environment — exige build novo, e um APK na
// mão de alguém carrega para sempre a URL do dia em que foi gerado.
//
// A comparação é AVISO, não bloqueio: exige EAS CLI autenticado, e uma guarda
// que falha na máquina de quem só quer editar documentação vira `--no-verify`.
// Mesma escolha de `check-db-types.js` com o Docker.

function compararComEas(nomeEnv, varsDoArquivo) {
  const { spawnSync } = require("node:child_process");

  const r = spawnSync(
    "npx",
    ["--no-install", "eas", "env:list", "--environment", nomeEnv, "--format", "long"],
    { encoding: "utf8", shell: process.platform === "win32", timeout: 60_000 },
  );

  if (r.status !== 0 || !r.stdout) {
    console.log(
      `\n⊘ Não deu para ler o environment '${nomeEnv}' do EAS (CLI ausente, sem login ou sem rede).` +
        `\n  A comparação foi pulada. Para conferir à mão:  eas env:list --environment ${nomeEnv}`,
    );
    return;
  }

  // `--format long` imprime blocos "Name  X" / "Value  Y". Variável marcada como
  // secret vem com o valor omitido — e omitido não é divergente.
  const doEas = {};
  let atual = null;
  for (const linha of r.stdout.split("\n")) {
    const nome = linha.match(/^\s*Name\s+(\S+)/);
    if (nome) {
      atual = nome[1];
      continue;
    }
    const valor = linha.match(/^\s*Value\s+(.*)$/);
    if (valor && atual) {
      doEas[atual] = valor[1].trim();
      atual = null;
    }
  }

  const divergentes = [];
  const ausentes = [];
  for (const [chave, valorLocal] of Object.entries(varsDoArquivo)) {
    const valorEas = doEas[chave];
    if (valorEas === undefined) {
      ausentes.push(chave);
    } else if (valorEas !== "" && valorEas !== valorLocal) {
      divergentes.push({ chave, local: valorLocal, eas: valorEas });
    }
  }

  if (ausentes.length === 0 && divergentes.length === 0) {
    console.log(`✓ environment '${nomeEnv}' do EAS bate com o arquivo do repositório`);
    return;
  }

  console.warn(`\n⚠ O environment '${nomeEnv}' do EAS não bate com o arquivo do repositório.`);
  console.warn(`  É o build do EAS que vai para o APK — não este arquivo.\n`);

  for (const chave of ausentes) {
    console.warn(`  ausente no EAS   ${chave}`);
    console.warn(
      `      eas env:create --environment ${nomeEnv} --name ${chave} --value "${varsDoArquivo[chave]}"`,
    );
  }
  for (const d of divergentes) {
    console.warn(`  divergente       ${d.chave}`);
    console.warn(`      repositório: ${d.local}`);
    console.warn(`      EAS:         ${d.eas}`);
  }
  console.warn(
    `\n  Lembre: EXPO_PUBLIC_* é inlinada no bundle. Corrigir o environment não` +
      `\n  conserta um APK já gerado — é preciso build novo.\n`,
  );
}

// Só faz sentido para os environments que o EAS conhece (ver eas.json).
if (["development", "preview", "production"].includes(env)) {
  compararComEas(
    env,
    Object.fromEntries(
      Object.entries(appEnvMap)
        .filter(([src]) => vars[src] !== undefined)
        .map(([src, dest]) => [dest, vars[src]]),
    ),
  );
}

console.log(`\nAmbiente: ${env} — sincronizado com sucesso.`);
