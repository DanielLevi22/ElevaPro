#!/usr/bin/env node
/**
 * check-navigation-casts.js
 *
 * Falha quando uma chamada de navegação do mobile silencia o tipo da rota —
 * `router.push(algo as never)` e variantes.
 *
 * `typedRoutes` está ligado em `app.json`: o Expo Router gera a união de todas
 * as rotas que existem, e passar qualquer outra coisa é erro de compilação.
 * `as never` desliga essa verificação, e o que ela pegaria vira botão morto.
 *
 * Não é hipótese. Ao remover os 44 casts de navegação, o compilador apontou
 * três destinos que não existiam:
 *   - `/assessment/anamnesis`, num botão da avaliação física (a rota real é
 *     `/student/anamnesis`);
 *   - `/settings`, um item inteiro do menu principal;
 *   - `/workouts/[id]/assignments`, declarado em `ROUTES` e nunca criado.
 *
 * Nenhum deles dava erro em runtime: o Expo Router simplesmente não navega, e o
 * usuário toca no botão e não acontece nada.
 *
 * O cast fora de navegação não é assunto desta guarda — lá ele é outra dívida
 * (DT-39), com outra correção.
 *
 * Uso: npm run app:check-nav
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "app/src");

/** `router.push(...)`, `router.replace(...)`, `navigation.navigate(...)`. */
const NAVEGACAO = /\b(?:router|navigation)\.(?:push|replace|navigate)\s*\(/;
const CAST = /\bas\s+(?:never|unknown|any)\b/;

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

function main() {
  const achados = [];

  for (const arquivo of arquivos(DIR)) {
    const linhas = fs.readFileSync(arquivo, "utf8").split("\n");
    for (const [indice, linha] of linhas.entries()) {
      if (/^\s*(\/\/|\*|\/\*)/.test(linha)) continue;
      if (NAVEGACAO.test(linha) && CAST.test(linha)) {
        const relativo = path.relative(ROOT, arquivo).split(path.sep).join("/");
        achados.push(`${relativo}:${indice + 1}`);
      }
    }
  }

  if (achados.length === 0) {
    console.log("✓ Nenhuma navegação com o tipo da rota silenciado.");
    return;
  }

  console.error(`\n✗ ${achados.length} navegação(ões) com cast:\n`);
  for (const achado of achados) console.error(`   ${achado}`);
  console.error(
    "\n   `typedRoutes` já sabe quais rotas existem. Com o cast, rota\n" +
      "   inexistente deixa de ser erro de compilação e vira botão que não\n" +
      "   faz nada — sem erro, sem log, sem sintoma.\n\n" +
      "   Use uma entrada de `app/src/navigation/types.ts`:\n" +
      "     router.push(ROUTES.STUDENTS.DETAILS(id))\n\n" +
      "   Se a rota não estiver lá, o destino provavelmente não existe.\n",
  );
  process.exit(1);
}

main();
