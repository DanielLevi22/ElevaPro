#!/usr/bin/env node
/**
 * check-medidas-fixas.js
 *
 * Recusa medida em pixel fixo nas classes de interface do mobile.
 *
 * ── O defeito que esta guarda existe para fechar ─────────────────────────────
 *
 * O kit do Claude Design foi desenhado num telefone de 390pt. O aparelho de
 * teste tem 448dp de largura e 997dp de altura — 15% e 25% mais. Medida escrita
 * em pixel fixo não acompanha: o desenho aparece proporcionalmente menor, e
 * sobra faixa vazia embaixo.
 *
 * A saída é `rem`. O `metro.config.js` desliga o inline (`inlineRem: false`),
 * então o NativeWind resolve `rem` em runtime a partir de um observável, e
 * `ajustarEscalaDeTexto()` move a base conforme a largura do aparelho. Texto,
 * espaço e raio acompanham juntos — a escala de espaço do Tailwind já é em
 * `rem` (`p-4` = 1rem).
 *
 * Para o que chega como número e não como classe — `size` de ícone, altura
 * calculada — existe o hook `useEscala()`.
 *
 * ── Catraca, não bloqueio ────────────────────────────────────────────────────
 *
 * Quando esta guarda foi escrita havia 282 medidas fixas em 69 arquivos.
 * Bloquear todas de uma vez seria um muro que ninguém atravessa, e muro assim
 * vira `--no-verify` — proibido pelo `CLAUDE.md`. Só o arquivo que o commit
 * toca é verificado, igual à guarda de cor e à de tamanho de arquivo.
 *
 * ── O que continua valendo em pixel ─────────────────────────────────────────
 *
 * Fio de separador. `0.5px` é o hairline do desenho e `1px` é a borda mínima:
 * são constantes do aparelho, não medidas do desenho. Engrossá-los junto com a
 * escala deixaria a linha grossa numa tela grande, que é o oposto do desejado.
 *
 * Uso: node scripts/check-medidas-fixas.js
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const RAIZ_VERIFICADA = "app/src/";

/** Valor em classe arbitrária do Tailwind: `h-[50px]`, `mt-[18px]`. */
const MEDIDA_FIXA = /\[(\d+(?:\.\d+)?)px\]/g;

/** Fio de separador e borda mínima: constante do aparelho, não do desenho. */
const FIOS = new Set(["0.5", "1"]);

function arquivosDoCommit() {
  return execSync("git diff --cached --name-only --diff-filter=ACM", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

function deveVerificar(arquivo) {
  if (!arquivo.startsWith(RAIZ_VERIFICADA)) return false;
  if (arquivo.includes("__tests__")) return false;
  if (!arquivo.endsWith(".tsx")) return false;
  return fs.existsSync(path.join(ROOT, arquivo));
}

const problemas = [];

for (const arquivo of arquivosDoCommit().filter(deveVerificar)) {
  const linhas = fs.readFileSync(path.join(ROOT, arquivo), "utf8").split("\n");
  linhas.forEach((linha, i) => {
    const achados = [...linha.matchAll(MEDIDA_FIXA)].filter(([, valor]) => !FIOS.has(valor));
    if (achados.length > 0) {
      problemas.push({
        arquivo,
        linha: i + 1,
        medidas: achados.map(([inteiro]) => inteiro),
        texto: linha.trim(),
      });
    }
  });
}

if (problemas.length > 0) {
  console.error("\n✗ Medida em pixel fixo em arquivo deste commit:\n");
  for (const p of problemas) {
    console.error(`  ${p.arquivo}:${p.linha}  ${p.medidas.join(", ")}`);
    console.error(`    ${p.texto}\n`);
  }
  console.error(
    "  O desenho foi feito para um telefone de 390pt; o aparelho de teste tem\n" +
      "  448dp de largura. Pixel fixo não acompanha, e o desenho aparece menor.\n\n" +
      "  Em classe: divida por 16 e use `rem` — `h-[50px]` vira `h-[3.125rem]`.\n" +
      "  Em prop numérica (`size` de ícone): `const escalar = useEscala()`.\n\n" +
      "  Fio de `0.5px` e borda de `1px` seguem liberados: são constante do\n" +
      "  aparelho, e engrossariam numa tela grande se escalassem.\n\n" +
      "  Só arquivo tocado por este commit é verificado — é assim que a dívida\n" +
      "  sai por onde o trabalho passa.\n",
  );
  process.exit(1);
}

console.log("✓ Nenhuma medida em pixel fixo nos arquivos deste commit.");
