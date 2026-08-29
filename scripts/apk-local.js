#!/usr/bin/env node
/**
 * apk-local.js
 *
 * Gera um APK de release na sua máquina apontando para um ambiente do EAS.
 *
 * Uso:
 *   node scripts/apk-local.js            → preview (padrão)
 *   node scripts/apk-local.js production
 *
 * ── Por que um script, e não três comandos no README ─────────────────────────
 *
 * Os três comandos existiam e mesmo assim o primeiro APK saiu sem falar com o
 * servidor. O que faltava não era o passo, era a CONFERÊNCIA entre os passos:
 * ninguém olha dentro do bundle para ver se o valor entrou, e o sintoma só
 * aparece com o app na mão, longe da causa.
 *
 * Duas verificações, em ordem de força:
 *
 * 1. `check-env-access.js`, ANTES de compilar. É a que de fato protege: recusa
 *    `process.env[VAR]`, a leitura por chave dinâmica que não é inlinada.
 * 2. A URL dentro do bundle, DEPOIS. Necessária, não suficiente — o APK que
 *    motivou este script continha a URL e mesmo assim reclamava, porque quem a
 *    inlinou foi outro arquivo. Serve para pegar ambiente vazio, não leitura
 *    errada.
 *
 * ── O que ele NÃO faz ────────────────────────────────────────────────────────
 *
 * Não assina para distribuição: o `build.gradle` usa a keystore de debug no
 * `release`. Serve para testar no seu aparelho. Binário distribuível continua
 * saindo do EAS.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const APP = path.join(RAIZ, "app");
const ENV_LOCAL = path.join(APP, ".env.local");
const APK = path.join(
  APP,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

const ambiente = process.argv[2] || "preview";

if (!["preview", "production", "development"].includes(ambiente)) {
  console.error(
    `\n❌  Ambiente inválido: "${ambiente}". Use preview, production ou development.\n`,
  );
  process.exit(1);
}

/** Roda mostrando a saída, e morre com a mensagem do passo que falhou. */
function passo(titulo, comando, args, opcoes = {}) {
  console.log(`\n▶  ${titulo}`);
  try {
    execFileSync(comando, args, { stdio: "inherit", shell: true, ...opcoes });
  } catch {
    console.error(`\n❌  Falhou em: ${titulo}\n`);
    process.exit(1);
  }
}

// ── 1. variáveis do ambiente escolhido ───────────────────────────────────────
// `env:pull` escreve `.env.local`, que tem precedência sobre todos os outros
// arquivos do Expo. É a mesma fonte que o build do EAS usa, então o APK local
// e o da nuvem inlinam os mesmos valores.
passo(
  `Puxando variáveis do ambiente "${ambiente}" do EAS`,
  "npx",
  ["eas-cli", "env:pull", "--environment", ambiente],
  { cwd: APP },
);

if (!fs.existsSync(ENV_LOCAL)) {
  console.error(`\n❌  ${ENV_LOCAL} não foi criado. Você está logado? \`npx eas-cli login\`\n`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_LOCAL, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const apiUrl = env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  console.error(`\n❌  EXPO_PUBLIC_API_URL não veio do ambiente "${ambiente}".\n`);
  process.exit(1);
}
console.log(`   BFF: ${apiUrl}`);

// ── 2. a causa, antes de gastar o build ──────────────────────────────────────
// Chave dinâmica não é inlinada, e o APK sai reclamando de configuração com o
// arquivo de ambiente certo no lugar. Barrar aqui custa segundos; descobrir
// depois custa um build e um teste no aparelho.
passo("Verificando como as variáveis são lidas", "node", [
  path.join("scripts", "check-env-access.js"),
]);

// ── 3. compilar ──────────────────────────────────────────────────────────────
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
passo("Compilando o APK de release", gradlew, ["assembleRelease", "--console=plain"], {
  cwd: path.join(APP, "android"),
});

if (!fs.existsSync(APK)) {
  console.error(`\n❌  O build terminou mas o APK não está em ${APK}\n`);
  process.exit(1);
}

// ── 4. o efeito, depois do build ─────────────────────────────────────────────
// Necessária, não suficiente: prova que o ambiente não veio vazio, mas não diz
// QUAL ponto de leitura recebeu o valor. O APK que motivou este script continha
// a URL — inlinada por outro arquivo — e mesmo assim reclamava. Quem protege
// contra isso é o passo 2.
console.log("\n▶  Conferindo se o valor entrou no bundle");

const bundle = execFileSync("unzip", ["-p", APK, "assets/index.android.bundle"], {
  maxBuffer: 512 * 1024 * 1024,
  shell: true,
}).toString("latin1");

const host = apiUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

if (!bundle.includes(host)) {
  console.error(
    `\n❌  O APK foi gerado, mas "${host}" NÃO está no bundle.\n\n` +
      `   O app vai dizer que não está configurado para falar com o servidor.\n` +
      `   Isso é ambiente vindo vazio — leitura por chave dinâmica já teria sido\n` +
      `   barrada no passo 2, antes de compilar.\n`,
  );
  process.exit(1);
}

const tamanho = (fs.statSync(APK).size / 1024 / 1024).toFixed(0);

console.log(`
✅  APK pronto e conferido

   Arquivo  : ${path.relative(RAIZ, APK)}  (${tamanho} MB)
   Ambiente : ${ambiente}
   BFF      : ${apiUrl}

   Instalar:
     adb install -r "${APK}"

⚠️  Assinado com a keystore de DEBUG — serve para testar no seu aparelho, não
    para distribuir. Binário distribuível sai do EAS.

⚠️  \`app/.env.local\` continua no disco e vence em qualquer build seguinte.
    Apague quando terminar:  Remove-Item app/.env.local
`);
