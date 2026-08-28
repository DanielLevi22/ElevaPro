#!/usr/bin/env node
/**
 * check-api-auth.js
 *
 * Falha quando uma rota do BFF não importa `@/lib/api-auth`.
 *
 * `service_role` ignora RLS por definição: numa rota que o usa, a RLS não
 * participa e a única barreira é a checagem do próprio código. A auditoria de
 * 2026-08-11 encontrou doze cópias dessa checagem espalhadas por `app/api/`, e
 * duas funções chamadas `getCallerSpecialist` com garantias diferentes — quem
 * lia a rota de IA via um nome conhecido e assumia a garantia que ele dava nos
 * outros arquivos. Resultado: qualquer conta autenticada lia a anamnese de
 * qualquer aluno.
 *
 * O escopo começou nas rotas que usam `service_role` e passou a valer para
 * TODA rota sob `/api/`. O corte antigo deixava um buraco do tamanho do
 * problema: seis rotas de IA reimplantavam a checagem à mão, cinco delas com
 * `const { data } = await client.auth.getUser(token)` — erro descartado —, e
 * nenhuma era vista por esta guarda, porque não tocavam `supabaseAdmin`. Elas
 * provavam que existe um usuário, nunca qual papel ele tem.
 *
 * A limitação é a mesma do `check-rls.js` e está assumida: isto prova que a
 * autorização foi CHAMADA, nunca que ela está CORRETA. Quem prova comportamento
 * é `web/src/lib/__tests__/api-auth.test.ts` e o teste de rota com três tokens.
 *
 * Uso: npm run api:check-auth
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "web/src/app/api");
const ADMIN_IMPORT = /from\s+["']@\/lib\/supabase-admin["']/;
const AUTH_IMPORT = /from\s+["']@\/lib\/api-auth["']/;

/**
 * Rotas públicas por decisão de produto — cadastro acontece antes de existir
 * conta para autorizar. Entrada aqui é decisão consciente, não conveniência.
 */
const PUBLIC_ROUTES = new Set(["auth/register/route.ts", "auth/register/student/route.ts"]);

function findRoutes(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findRoutes(full));
    else if (entry.name === "route.ts") found.push(full);
  }
  return found;
}

function main() {
  if (!fs.existsSync(API_DIR)) {
    console.log("✓ Nenhuma rota de API para verificar.");
    return;
  }

  const desprotegidas = [];

  for (const file of findRoutes(API_DIR)) {
    const relativa = path.relative(API_DIR, file).split(path.sep).join("/");
    if (PUBLIC_ROUTES.has(relativa)) continue;

    const source = fs.readFileSync(file, "utf8");
    if (!AUTH_IMPORT.test(source)) {
      desprotegidas.push({ rota: relativa, usaAdmin: ADMIN_IMPORT.test(source) });
    }
  }

  if (desprotegidas.length === 0) {
    console.log("✓ Toda rota sob /api/ passa por @/lib/api-auth.");
    return;
  }

  console.error(`\n✗ ${desprotegidas.length} rota(s) sem autorização:\n`);
  for (const r of desprotegidas) {
    console.error(`   api/${r.rota}${r.usaAdmin ? "   (usa service_role)" : ""}`);
  }
  console.error(
    "\n   Checagem à mão não vale: a versão que este script substituiu fazia\n" +
      "   `const { data } = await client.auth.getUser(token)`, descartava o erro\n" +
      "   e provava apenas que existe um usuário. E service_role ignora RLS.\n\n" +
      "   Importe de @/lib/api-auth e use a função\n" +
      "   cujo nome descreve a garantia necessária:\n\n" +
      "     authorizeUser(request)                        — token válido\n" +
      "     authorizeSpecialist(request)                  — + conta de especialista\n" +
      "     authorizeLinkedSpecialist(request, studentId) — + vínculo ativo\n" +
      "     authorizeStudent(request)                     — conta de aluno\n\n" +
      "   Rota que recebe studentId por parâmetro precisa da terceira.\n" +
      "   Rota pública de propósito entra em PUBLIC_ROUTES deste script.\n",
  );
  process.exit(1);
}

main();
