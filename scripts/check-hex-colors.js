#!/usr/bin/env node
/**
 * check-hex-colors.js
 *
 * Recusa cor hexadecimal escrita à mão em código de interface do mobile.
 *
 * ── O defeito que esta guarda existe para fechar ─────────────────────────────
 *
 * O `CLAUDE.md` diz desde sempre que a estilização do mobile usa só NativeWind
 * com token do design system. Quando esta guarda foi escrita havia **685**
 * hexadecimais espalhados por 110 arquivos. A regra existia, estava escrita, e
 * foi ignorada 685 vezes — porque nada além da boa vontade a verificava.
 *
 * Com 51 telas prestes a serem reconstruídas, a regra sem verificação só
 * garante que o problema volta com números maiores.
 *
 * ── Catraca, não bloqueio ────────────────────────────────────────────────────
 *
 * Só é verificado o arquivo que o commit toca. Bloquear os 685 de uma vez seria
 * um muro que ninguém consegue atravessar, e muro assim vira `--no-verify` —
 * proibido pelo `CLAUDE.md` exatamente por isso. É o mesmo raciocínio que o
 * `check-file-size.js` já tinha registrado.
 *
 * Quem toca um arquivo, tira o hexadecimal dele. A dívida sai por onde o
 * trabalho passa.
 *
 * ── A saída autorizada ───────────────────────────────────────────────────────
 *
 * Classe do NativeWind resolve a maioria dos casos. Para prop que não aceita
 * `className` — `color` de ícone, `colors` de `LinearGradient`, `tint` de
 * `BlurView`, `placeholderTextColor` — existe `useCores()`. A cor literal mora
 * num arquivo só, e é ele o único da allowlist.
 *
 * Uso: node scripts/check-hex-colors.js
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const RAIZ_VERIFICADA = "app/src/";
const EXTENSOES = new Set([".ts", ".tsx"]);

/**
 * O único lugar onde cor literal pode morar: a fonte dos tokens. Tudo o mais
 * deriva dela.
 */
const ALLOWLIST = new Set(["app/src/shared/design/tokens.ts"]);

/** `#rgb`, `#rrggbb` ou `#rrggbbaa`, com fronteira para não pegar `#1` de rota. */
const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

function arquivosDoCommit() {
  const saida = execSync("git diff --cached --name-only --diff-filter=ACM", {
    cwd: ROOT,
    encoding: "utf8",
  });
  return saida.split("\n").filter(Boolean);
}

/**
 * Comentário citando cor é documentação, não uso — e boa parte dos comentários
 * do módulo de design existe justamente para registrar qual hexadecimal cada
 * token produz.
 */
function semComentario(linha) {
  return linha
    .replace(/\/\/.*$/, "")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/^\s*\*.*$/, "");
}

function achadosEm(arquivo) {
  const conteudo = fs.readFileSync(path.join(ROOT, arquivo), "utf8");
  const achados = [];
  conteudo.split("\n").forEach((linha, i) => {
    const cores = semComentario(linha).match(HEX);
    if (cores) achados.push({ linha: i + 1, cores, texto: linha.trim() });
  });
  return achados;
}

function deveVerificar(arquivo) {
  if (!arquivo.startsWith(RAIZ_VERIFICADA)) return false;
  if (ALLOWLIST.has(arquivo)) return false;
  if (arquivo.includes("__tests__")) return false;
  if (!EXTENSOES.has(path.extname(arquivo))) return false;
  return fs.existsSync(path.join(ROOT, arquivo));
}

const problemas = [];

for (const arquivo of arquivosDoCommit().filter(deveVerificar)) {
  for (const achado of achadosEm(arquivo)) {
    problemas.push({ arquivo, ...achado });
  }
}

if (problemas.length > 0) {
  console.error("\n✗ Cor hexadecimal escrita à mão em arquivo deste commit:\n");
  for (const p of problemas) {
    console.error(`  ${p.arquivo}:${p.linha}  ${p.cores.join(", ")}`);
    console.error(`    ${p.texto}\n`);
  }
  console.error(
    "  A cor do app vem de `@/shared/design`, que deriva do Claude Design.\n" +
      "  Hexadecimal à mão é como o app ficou coral por um mês com o token\n" +
      "  certo declarado ao lado — ver ADR-0025.\n\n" +
      "  Em `className`: use o token (`bg-primary`, `text-muted-foreground`).\n" +
      "  Em prop que não aceita classe: `const cores = useCores()`.\n\n" +
      "  Só arquivo tocado por este commit é verificado. Se o hexadecimal já\n" +
      "  estava aí, é a hora de tirá-lo — é assim que a dívida sai.\n",
  );
  process.exit(1);
}

console.log("✓ Nenhuma cor hexadecimal escrita à mão nos arquivos deste commit.");
