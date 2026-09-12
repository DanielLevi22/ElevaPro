#!/usr/bin/env node
/**
 * check-file-size.js
 *
 * O limite de 500 linhas que o `CLAUDE.md` define, em dois modos.
 *
 * Sem argumento: **avisa** sobre todos os arquivos acima do limite, e não
 * bloqueia. São 24 arquivos e cerca de 14 mil linhas, numa base com 9% de
 * cobertura no mobile. Quebrar tudo de uma vez troca dívida conhecida por
 * regressão desconhecida, e um bloqueio que ninguém consegue atender vira
 * `--no-verify` — que o `CLAUDE.md` proíbe justamente por isso.
 *
 * Com `--tocados`: **bloqueia**, mas só o arquivo que o commit toca. É a regra
 * de manutenção que este arquivo sempre descreveu — "arquivo acima de 500
 * linhas que for tocado sai do PR abaixo de 500" — agora verificada em vez de
 * combinada. Roda no pre-commit.
 *
 * A catraca é o que torna o bloqueio atendível: ninguém precisa reescrever 24
 * arquivos para commitar, e a dívida sai por onde o trabalho já ia passar.
 *
 * Arquivo gerado não conta: `database.types.ts` tem 1.558 linhas porque o banco
 * tem esse tamanho, e ninguém o edita à mão.
 *
 * Uso: npm run check:file-size · npm run check:file-size:tocados
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const FONTES = ["app/src", "web/src", "shared/src"];
const LIMITE = 500;

/** Gerado do banco por `npm run db:types` — o tamanho é do schema, não do código. */
const IGNORADOS = new Set(["shared/src/database/database.types.ts"]);

function arquivos(dir) {
  const encontrados = [];
  const pilha = [path.join(ROOT, dir)];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    if (!fs.existsSync(atual)) continue;
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name !== "node_modules") pilha.push(completo);
      } else if (/\.tsx?$/.test(entrada.name)) {
        encontrados.push(completo);
      }
    }
  }
  return encontrados;
}

function acimaDoLimite() {
  const grandes = [];
  for (const dir of FONTES) {
    for (const arquivo of arquivos(dir)) {
      const relativo = path.relative(ROOT, arquivo).split(path.sep).join("/");
      if (IGNORADOS.has(relativo)) continue;

      const linhas = fs.readFileSync(arquivo, "utf8").split("\n").length;
      if (linhas > LIMITE) grandes.push({ relativo, linhas });
    }
  }
  return grandes.sort((a, b) => b.linhas - a.linhas);
}

/**
 * A catraca: o arquivo que o commit toca precisa sair abaixo do limite.
 *
 * É a regra que o cabeçalho deste arquivo sempre descreveu — "arquivo acima de
 * 500 linhas que for tocado sai do PR abaixo de 500" — só que agora verificada,
 * em vez de combinada. Continua sem bloquear os outros: quem não é tocado
 * segue na lista de aviso, e a dívida sai por onde o trabalho passa.
 */
function main() {
  const grandes = acimaDoLimite();
  const tocados = process.argv.includes("--tocados");

  if (tocados) {
    const doCommit = new Set(
      execSync("git diff --cached --name-only --diff-filter=ACM", { cwd: ROOT, encoding: "utf8" })
        .split("\n")
        .filter(Boolean),
    );
    const infratores = grandes.filter(({ relativo }) => doCommit.has(relativo));

    if (infratores.length > 0) {
      console.error(`\n✗ Arquivo tocado por este commit acima de ${LIMITE} linhas:\n`);
      for (const { relativo, linhas } of infratores) {
        console.error(`   ${String(linhas).padStart(5)}  ${relativo}`);
      }
      console.error(
        `\n   O ${"CLAUDE.md"} define ${LIMITE} linhas e uma responsabilidade por arquivo.\n` +
          "   A regra não é reescrever tudo — é que o arquivo que você tocou sai\n" +
          "   deste commit abaixo do limite. Tire a lógica para um hook, ou a\n" +
          "   subárvore para um componente do módulo.\n",
      );
      process.exit(1);
    }
    console.log(`✓ Nenhum arquivo deste commit acima de ${LIMITE} linhas.`);
    return;
  }

  if (grandes.length === 0) {
    console.log(`✓ Nenhum arquivo acima de ${LIMITE} linhas.`);
    return;
  }

  console.log(`\n⚠ ${grandes.length} arquivo(s) acima de ${LIMITE} linhas:\n`);
  for (const { relativo, linhas } of grandes) {
    console.log(`   ${String(linhas).padStart(5)}  ${relativo}`);
  }
  console.log(
    "\n   Aviso, não bloqueio. A regra é: arquivo desta lista que o seu PR\n" +
      "   tocar sai dele abaixo de 500 linhas. Reescrever todos de uma vez,\n" +
      "   sem cobertura, troca dívida conhecida por regressão desconhecida.\n",
  );
}

main();
