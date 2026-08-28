#!/usr/bin/env node
/**
 * check-file-size.js
 *
 * Avisa — **não bloqueia** — sobre arquivos acima do limite de 500 linhas que o
 * `CLAUDE.md` define.
 *
 * Aviso, e não erro, de propósito. São 24 arquivos e cerca de 14 mil linhas,
 * numa base com 9% de cobertura no mobile. Quebrar tudo de uma vez troca dívida
 * conhecida por regressão desconhecida, e um bloqueio que ninguém consegue
 * atender vira `--no-verify` — que o `CLAUDE.md` proíbe justamente por isso.
 *
 * A regra que vale é outra, e é de manutenção: **arquivo acima de 500 linhas
 * que for tocado por qualquer motivo sai do PR abaixo de 500.** Este script
 * existe para essa conversa acontecer na revisão, com o número na tela.
 *
 * Arquivo gerado não conta: `database.types.ts` tem 1.558 linhas porque o banco
 * tem esse tamanho, e ninguém o edita à mão.
 *
 * Uso: npm run check:file-size
 */

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

function main() {
  const grandes = [];

  for (const dir of FONTES) {
    for (const arquivo of arquivos(dir)) {
      const relativo = path.relative(ROOT, arquivo).split(path.sep).join("/");
      if (IGNORADOS.has(relativo)) continue;

      const linhas = fs.readFileSync(arquivo, "utf8").split("\n").length;
      if (linhas > LIMITE) grandes.push({ relativo, linhas });
    }
  }

  if (grandes.length === 0) {
    console.log(`✓ Nenhum arquivo acima de ${LIMITE} linhas.`);
    return;
  }

  grandes.sort((a, b) => b.linhas - a.linhas);
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
