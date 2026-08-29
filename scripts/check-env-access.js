#!/usr/bin/env node
/**
 * check-env-access.js
 *
 * Recusa leitura de `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` por chave dinâmica.
 *
 * ── O defeito que esta guarda existe para fechar ─────────────────────────────
 *
 * Em 2026-08-29 o APK de release dizia "o app não está configurado para falar
 * com o servidor" enquanto o `.env.local` estava certo e o valor aparecia no
 * bundle. A causa: `process.env[VAR_URL]`, com a chave numa constante.
 *
 * O Babel do Expo (e o do Next) substituem `process.env.NOME` pelo valor em
 * tempo de build, e só conseguem quando o nome está escrito literalmente. Com
 * chave em variável não há o que substituir: nada é inlinado, e em release não
 * existe `process.env` em runtime para consultar.
 *
 * O que torna isso caro é que passa em desenvolvimento. O Metro popula
 * `process.env` no modo dev, então emulador e testes funcionam; só o bundle de
 * release quebra — depois do build, longe da causa, com uma mensagem que culpa
 * a configuração.
 *
 * ── O que ela não pega ───────────────────────────────────────────────────────
 *
 * Leitura montada em runtime de outra forma (`process["env"]`, destructuring de
 * `process.env`). São formas que ninguém escreveu aqui; a guarda cobre a que
 * custou um build.
 */

const fs = require("node:fs");
const path = require("node:path");

const RAIZES = ["app/src", "web/src", "shared/src"];
const EXTENSOES = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORAR = new Set(["node_modules", "__tests__", ".next", "android", "ios"]);

/** `process.env[` seguido de qualquer coisa que não seja aspas — ou seja, variável. */
const DINAMICO = /process\.env\s*\[\s*(?!['"`])/;

function* arquivos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const nome of fs.readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue;
    const completo = path.join(dir, nome);
    if (fs.statSync(completo).isDirectory()) yield* arquivos(completo);
    else if (EXTENSOES.has(path.extname(nome))) yield completo;
  }
}

const achados = [];

for (const raiz of RAIZES) {
  for (const arquivo of arquivos(raiz)) {
    const linhas = fs.readFileSync(arquivo, "utf8").split("\n");
    linhas.forEach((linha, i) => {
      // Comentário citando o padrão errado é documentação, não uso.
      const semComentario = linha.replace(/\/\/.*$/, "").replace(/\*.*$/, "");
      if (DINAMICO.test(semComentario)) {
        achados.push({ arquivo, linha: i + 1, texto: linha.trim() });
      }
    });
  }
}

if (achados.length > 0) {
  console.error("\n✗ Leitura de variável de ambiente por chave dinâmica:\n");
  for (const a of achados) {
    console.error(`  ${a.arquivo}:${a.linha}`);
    console.error(`    ${a.texto}\n`);
  }
  console.error(
    "  `EXPO_PUBLIC_*` e `NEXT_PUBLIC_*` são substituídas pelo valor em tempo de build,\n" +
      "  e isso só acontece com o nome escrito literalmente: `process.env.NOME`.\n" +
      "  Com chave em variável nada é inlinado, e o bundle de release lê `undefined`.\n\n" +
      "  Passa em desenvolvimento — o Metro popula `process.env` em modo dev —, então\n" +
      "  o defeito só aparece no APK. Escreva o nome literal.\n",
  );
  process.exit(1);
}

console.log("✓ Nenhuma variável de ambiente lida por chave dinâmica.");
