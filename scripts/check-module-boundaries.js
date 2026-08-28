#!/usr/bin/env node
/**
 * check-module-boundaries.js
 *
 * Falha quando um módulo do mobile importa outro módulo direto — o que o
 * `CLAUDE.md` proíbe:
 *
 *     ✅ Módulo → shared/ | @elevapro/core | @elevapro/supabase
 *     ✅ Screen  → Módulo (via index.ts)
 *     ❌ Módulo → Módulo direto
 *
 * O web tem zero violações e o mobile tinha 25. A diferença não é disciplina:
 * é que ninguém verificava. Sem guarda, a regra vale enquanto alguém lembra.
 *
 * ## Por que catraca, e não zero
 *
 * Oito eram o módulo importando **a si mesmo** por caminho absoluto em vez de
 * relativo — corrigidos, porque não há decisão envolvida.
 *
 * Os 17 restantes são acoplamento de verdade, e sete deles apontam para o mesmo
 * lugar: `auth/store/authStore`, que virou dependência global de fato. Resolver
 * isso é mover estado de autenticação para `shared/` — o que arrasta Zustand
 * para lá e abre risco de ciclo. É refatoração com decisão de arquitetura
 * dentro, não limpeza; fazer às pressas troca dívida conhecida por regressão.
 *
 * Então o teto por arquivo fica registrado em `module-boundaries-baseline.txt`
 * e a guarda falha quando ele **cresce**. Acoplamento novo é barrado hoje; o
 * existente desce quando for atacado de propósito.
 *
 * Uso: npm run app:check-modules
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MODULOS = path.join(ROOT, "app/src/modules");
const BASELINE = path.join(__dirname, "module-boundaries-baseline.txt");

const IMPORT_MODULO = /from\s+["']@\/modules\/([^"']+)["']/g;

function arquivos(dir) {
  const encontrados = [];
  const pilha = [dir];
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

function lerBaseline() {
  const teto = new Map();
  if (!fs.existsSync(BASELINE)) return teto;
  for (const linha of fs.readFileSync(BASELINE, "utf8").split("\n")) {
    const limpa = linha.trim();
    if (limpa === "" || limpa.startsWith("#")) continue;
    const corte = limpa.lastIndexOf(" ");
    teto.set(limpa.slice(0, corte), Number(limpa.slice(corte + 1)));
  }
  return teto;
}

function main() {
  const porArquivo = new Map();
  const detalhes = [];

  for (const arquivo of arquivos(MODULOS)) {
    const relativo = path.relative(ROOT, arquivo).split(path.sep).join("/");
    const moduloDono = relativo.split("app/src/modules/")[1].split("/")[0];
    const fonte = fs.readFileSync(arquivo, "utf8");

    IMPORT_MODULO.lastIndex = 0;
    let m = IMPORT_MODULO.exec(fonte);
    while (m !== null) {
      const moduloAlvo = m[1].split("/")[0];
      // Importar a si mesmo por caminho absoluto é feio, mas não é cruzamento
      // de fronteira — e já foi convertido para relativo em toda a base.
      if (moduloAlvo !== moduloDono) {
        porArquivo.set(relativo, (porArquivo.get(relativo) ?? 0) + 1);
        detalhes.push({ arquivo: relativo, alvo: m[1] });
      }
      m = IMPORT_MODULO.exec(fonte);
    }
  }

  const teto = lerBaseline();
  const cresceram = [];
  for (const [arquivo, quantidade] of porArquivo) {
    const permitido = teto.get(arquivo) ?? 0;
    if (quantidade > permitido) cresceram.push({ arquivo, quantidade, permitido });
  }

  if (cresceram.length > 0) {
    console.error("\n✗ Import novo de módulo para módulo:\n");
    for (const c of cresceram) {
      console.error(`   ${c.arquivo} — ${c.quantidade} (teto: ${c.permitido})`);
      for (const d of detalhes.filter((x) => x.arquivo === c.arquivo)) {
        console.error(`      → @/modules/${d.alvo}`);
      }
    }
    console.error(
      "\n   O `CLAUDE.md` permite Módulo → shared/, não Módulo → Módulo.\n" +
        "   Se os dois precisam do mesmo código, ele pertence a `shared/`.\n" +
        "   Se é o módulo importando a si mesmo, use caminho relativo.\n",
    );
    process.exit(1);
  }

  const diminuiram = [];
  for (const [arquivo, permitido] of teto) {
    const quantidade = porArquivo.get(arquivo) ?? 0;
    if (quantidade < permitido) diminuiram.push({ arquivo, quantidade, permitido });
  }

  if (diminuiram.length > 0) {
    console.error("\n✗ Baseline desatualizado — o acoplamento caiu e o teto não:\n");
    for (const d of diminuiram) {
      console.error(`   ${d.arquivo} — ${d.quantidade} (teto: ${d.permitido})`);
    }
    console.error("\n   Atualize scripts/module-boundaries-baseline.txt.\n");
    process.exit(1);
  }

  const total = [...porArquivo.values()].reduce((soma, n) => soma + n, 0);
  console.log(
    total === 0
      ? "✓ Nenhum import de módulo para módulo."
      : `✓ Nenhum import novo de módulo para módulo (${total} no baseline, a revisar).`,
  );
}

main();
