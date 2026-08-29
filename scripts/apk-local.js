#!/usr/bin/env node
/**
 * apk-local.js
 *
 * Gera um APK de release na sua máquina apontando para um ambiente do EAS.
 *
 * Uso:
 *   npm run apk:preview
 *   npm run apk:production
 *   node scripts/apk-local.js preview
 *
 * ── Por que não usa `.env.local` ─────────────────────────────────────────────
 *
 * O caminho óbvio seria `eas env:pull`, que escreve `.env.local`. Mas esse
 * arquivo **sobrevive ao build** e tem precedência sobre todos os outros do
 * Expo: o build seguinte — inclusive um que você queira apontar para outro
 * ambiente — continuaria lendo dali, sem avisar.
 *
 * Aqui as variáveis vão direto para o ambiente do processo do Gradle, e o
 * arquivo temporário é apagado no fim. Um build, um ambiente, nenhum resíduo.
 *
 * ── Por que um script, e não três comandos no README ─────────────────────────
 *
 * Os três comandos existiam e mesmo assim o primeiro APK saiu sem falar com o
 * servidor. O que faltava não era o passo, era a CONFERÊNCIA entre eles: o
 * sintoma só aparece com o app na mão, longe da causa.
 *
 * Duas verificações, em ordem de força:
 *
 * 1. `check-env-access.js`, ANTES de compilar. É a que de fato protege: recusa
 *    `process.env[VAR]`, a leitura por chave dinâmica que não é inlinada.
 * 2. A URL dentro do bundle, DEPOIS. Necessária, não suficiente — o APK que
 *    motivou este script continha a URL e mesmo assim reclamava, porque quem a
 *    inlinou foi outro arquivo. Pega ambiente vazio, não leitura errada.
 *
 * ── O que ele NÃO faz ────────────────────────────────────────────────────────
 *
 * Não assina para distribuição: o `build.gradle` usa a keystore de debug no
 * `release`. Serve para testar no seu aparelho. Binário distribuível sai do EAS.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const APP = path.join(RAIZ, "app");
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
// Fora do repositório de propósito: o arquivo é insumo deste build, não estado
// do projeto. Mesma fonte que o build do EAS usa, então o APK local e o da
// nuvem inlinam os mesmos valores.
const temporario = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "apk-local-")),
  `.env.${ambiente}`,
);

passo(
  `Puxando variáveis do ambiente "${ambiente}" do EAS`,
  "npx",
  ["eas-cli", "env:pull", "--environment", ambiente, "--path", `"${temporario}"`],
  { cwd: APP },
);

if (!fs.existsSync(temporario)) {
  console.error(`\n❌  Nada foi baixado. Você está logado? \`npx eas-cli login\`\n`);
  process.exit(1);
}

const variaveis = Object.fromEntries(
  fs
    .readFileSync(temporario, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);

// O arquivo já cumpriu o papel. Some antes de qualquer coisa poder falhar e
// deixá-lo para trás.
fs.rmSync(path.dirname(temporario), { recursive: true, force: true });

const apiUrl = variaveis.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  console.error(`\n❌  EXPO_PUBLIC_API_URL não existe no ambiente "${ambiente}" do EAS.\n`);
  process.exit(1);
}

console.log(`   ${Object.keys(variaveis).length} variáveis · BFF: ${apiUrl}`);

// ── 2. a causa, antes de gastar o build ──────────────────────────────────────
// Chave dinâmica não é inlinada, e o APK sai reclamando de configuração com o
// ambiente certo no lugar. Barrar aqui custa segundos; descobrir depois custa
// um build e um teste no aparelho.
passo("Verificando como as variáveis são lidas", "node", [
  path.join("scripts", "check-env-access.js"),
]);

// ── 3. compilar, com o ambiente no processo ──────────────────────────────────
// `env` em vez de arquivo: o Metro e o Babel leem `process.env` do processo que
// os hospeda, então isto alcança o bundle sem deixar nada no disco.
if (fs.existsSync(path.join(APP, ".env.local"))) {
  console.warn(
    `\n⚠️  Existe um app/.env.local no disco. Ele tem precedência sobre o que este\n` +
      `    script injeta e pode apontar o build para outro lugar. Apague antes:\n` +
      `      Remove-Item app/.env.local\n`,
  );
  process.exit(1);
}

// Caminho absoluto: com `shell: true` o Windows não resolve `gradlew.bat` a
// partir do `cwd`, e o erro que sai — "is not recognized as an internal or
// external command" — não diz que o problema é o caminho.
const ANDROID = path.join(APP, "android");
const gradlew = path.join(ANDROID, process.platform === "win32" ? "gradlew.bat" : "gradlew");

// O APK anterior sai da frente ANTES de compilar. Sem isso, um build que
// terminasse sem gerar artefato deixaria o antigo no lugar, e a conferência do
// passo 4 aprovaria um arquivo velho — dizendo "pronto e conferido" sobre o
// binário que você já tinha. A checagem de existência depois do build só
// significa alguma coisa se o arquivo não existia antes dele.
if (fs.existsSync(APK)) {
  const anterior = fs.statSync(APK).mtime.toLocaleString("pt-BR");
  fs.rmSync(APK);
  console.log(`\n🗑  APK anterior removido (era de ${anterior})`);
}

passo("Compilando o APK de release", `"${gradlew}"`, ["assembleRelease", "--console=plain"], {
  cwd: ANDROID,
  env: { ...process.env, ...variaveis },
});

// Agora isto prova geração, não sobrevivência.
if (!fs.existsSync(APK)) {
  console.error(`\n❌  O build terminou mas não gerou APK em ${APK}\n`);
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

   Nenhum arquivo de ambiente ficou no repositório: as variáveis foram só para
   o processo deste build.
`);
