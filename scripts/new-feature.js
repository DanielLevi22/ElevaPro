#!/usr/bin/env node
/**
 * new-feature.js
 *
 * Abre a branch de uma issue já triada.
 * Uso: node scripts/new-feature.js <numero-da-issue>
 *
 * Exemplo: node scripts/new-feature.js 126
 *
 * O que faz:
 *   1. Lê a issue no GitHub e exige o label `ready-for-agent`
 *   2. Garante que está em `development` e atualizado
 *   3. Cria a branch `feature/<numero>-<slug-do-titulo>`
 *
 * Regra: nenhuma feature começa sem issue `ready-for-agent` (ADR-0013). O hook
 * pre-commit refaz essa checagem a cada commit, pela numeração da branch.
 */

const { execSync } = require("node:child_process");

const issueNumber = process.argv[2];

if (!issueNumber || !/^[0-9]+$/.test(issueNumber)) {
  console.error("\n❌  Número da issue obrigatório.");
  console.error("    Uso: node scripts/new-feature.js <numero-da-issue>");
  console.error("    Exemplo: node scripts/new-feature.js 126");
  console.error("\n    Não tem issue ainda? Crie a spec com /to-spec, ou:");
  console.error("    gh issue create --label ready-for-agent\n");
  process.exit(1);
}

/** Título vira slug de branch: minúsculas, sem acento, hífen entre palavras. */
function toSlug(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/, "");
}

// ── Ler a issue ──────────────────────────────────────────────────────────────

let issue;
try {
  const raw = execSync(`gh issue view ${issueNumber} --json title,state,labels`, {
    stdio: ["pipe", "pipe", "pipe"],
  });
  issue = JSON.parse(raw.toString());
} catch {
  console.error(`\n❌  Issue #${issueNumber} não encontrada, ou o gh não está autenticado.`);
  console.error("    gh auth status\n");
  process.exit(1);
}

if (issue.state !== "OPEN") {
  console.error(
    `\n❌  Issue #${issueNumber} está ${issue.state}. Reabra antes de trabalhar nela.\n`,
  );
  process.exit(1);
}

const labels = issue.labels.map((l) => l.name);

if (!labels.includes("ready-for-agent")) {
  console.error(`\n❌  Issue #${issueNumber} não está pronta para implementação.`);
  console.error(`    Título : ${issue.title}`);
  console.error(`    Labels : ${labels.join(", ") || "(nenhum)"}`);
  console.error("\n    Passe /triage nela primeiro, ou aplique o label à mão:");
  console.error(`    gh issue edit ${issueNumber} --add-label ready-for-agent\n`);
  process.exit(1);
}

const branchName = `feature/${issueNumber}-${toSlug(issue.title)}`;

// ── Criar branch ─────────────────────────────────────────────────────────────

console.log("\n🔀  Verificando branch development...");
try {
  execSync("git checkout development", { stdio: "pipe" });
  execSync("git pull origin development", { stdio: "pipe" });
} catch {
  console.error("❌  Falha ao atualizar development. Verifique sua conexão ou conflitos.");
  process.exit(1);
}

console.log(`🌿  Criando branch ${branchName}...`);
try {
  execSync(`git checkout -b ${branchName}`, { stdio: "pipe" });
} catch {
  console.error(`❌  Branch "${branchName}" já existe. Use: git checkout ${branchName}`);
  process.exit(1);
}

try {
  execSync(`gh issue edit ${issueNumber} --add-assignee @me`, { stdio: "pipe" });
} catch {
  console.log("⚠️   Não consegui te atribuir à issue — siga assim mesmo.");
}

console.log(`
✅  Tudo pronto!

   Issue  : #${issueNumber} — ${issue.title}
   Branch : ${branchName}

⏭   Próximos passos:

   1. Leia a issue inteira:
      gh issue view ${issueNumber} --comments

   2. Acorde os seams de teste na issue antes de codar.

   3. Ao terminar: se houve decisão difícil de reverter que o código não
      explica, registre um ADR em docs/adr/. Se não houve, não escreva nada.
`);
