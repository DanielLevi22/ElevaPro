#!/usr/bin/env node
/**
 * check-db-types.js
 *
 * Falha se `shared/src/database/database.types.ts` não for exatamente o que o
 * Supabase CLI gera a partir do banco local com todas as migrations aplicadas.
 *
 * Existe porque o arquivo gerado é a única coisa que amarra o código ao schema.
 * Enquanto ele viveu só em `web/src/lib/` e o cliente do mobile era construído
 * sem o genérico `Database`, toda consulta do app devolvia `any` — e foi por
 * isso que as dívidas #7 (12 tabelas fantasma), #10 (colunas fantasma no
 * admin), #40 (schema 4 colunas atrás) e #44 (nenhum caminho gravava
 * `physical_assessments`) nasceram como o mesmo defeito visto de ângulos
 * diferentes.
 *
 * Um arquivo gerado que ninguém regenera envelhece em silêncio: na auditoria de
 * 2026-08-28 ele estava sem `student_anamnesis.updated_at` (migration `0029`),
 * sem as seis colunas `framing_*` de `body_scans` (`0027`/`0028`) e ainda
 * declarava `start_date`/`end_date` como nuláveis, que a `0024` e a `0025`
 * tornaram NOT NULL. Nada disso aparecia como erro — o `any` cobria tudo.
 *
 * Precisa de Docker: sobe o Postgres local do Supabase, aplica as migrations e
 * gera os tipos. Onde não houver Docker, o script avisa e sai com 0 — a guarda
 * é do CI e do pre-commit de quem tem o ambiente, não um bloqueio para quem só
 * quer editar documentação.
 *
 * Uso: npm run db:check-types
 */

const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const TYPES_FILE = path.join(ROOT, "shared/src/database/database.types.ts");

/**
 * O binário do próprio projeto, nunca `npx biome`.
 *
 * `npx` cai no registro quando não acha o pacote instalado e baixa a versão
 * *latest* — e foi exatamente isso que quebrou esta guarda no CI: o job não
 * rodava `npm ci`, então os dois lados eram formatados por versões diferentes
 * do Biome. Duas versões produzem bytes diferentes do mesmo schema, e a guarda
 * acusava divergência que não existia.
 */
const BIOME = path.join(ROOT, "node_modules", "@biomejs", "biome", "bin", "biome");

function temDocker() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function gerarTipos() {
  return execFileSync(
    "npx",
    ["supabase", "gen", "types", "typescript", "--local", "--schema", "public"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, shell: true },
  );
}

/**
 * Passa os dois lados pelo mesmo formatador antes de comparar.
 *
 * O arquivo commitado é formatado pelo Biome e o recém-gerado não, e a
 * diferença não é só de espaço: o Biome acrescenta ponto e vírgula e remove o
 * pipe inicial das uniões. Comparar ignorando espaço em branco, portanto, não
 * resolve — o fluxo de tokens muda de verdade.
 */
function formatar(conteudo) {
  const tmp = path.join(os.tmpdir(), `elevapro-db-types-${process.pid}.ts`);
  fs.writeFileSync(tmp, conteudo);
  try {
    // `node <entrypoint>` em vez do atalho de `.bin`: no Windows o atalho é um
    // `.cmd`, e o Node 20 recusa spawná-lo sem shell. Chamar o JS direto evita
    // o shell e vale igual nos três sistemas.
    execFileSync(process.execPath, [BIOME, "format", "--write", tmp], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return fs.readFileSync(tmp, "utf8").trim();
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function main() {
  if (!fs.existsSync(TYPES_FILE)) {
    console.error(`\n✗ ${path.relative(ROOT, TYPES_FILE)} não existe.`);
    console.error("   Gere com: npm run db:types\n");
    process.exit(1);
  }

  if (!temDocker()) {
    console.log("• Docker indisponível — verificação de tipos do banco pulada.");
    return;
  }

  // Sem o Biome do projeto não dá para comparar de forma determinística. Falhar
  // aqui é melhor que formatar com uma versão qualquer e acusar divergência
  // inexistente — que foi como esta guarda quebrou no CI da primeira vez.
  if (!fs.existsSync(BIOME)) {
    console.error("\n✗ Biome do projeto não encontrado em node_modules/.bin.");
    console.error("   Rode `npm ci` na raiz antes desta verificação.\n");
    process.exit(1);
  }

  let gerado;
  try {
    gerado = gerarTipos();
  } catch (erro) {
    console.error("\n✗ Não foi possível gerar os tipos do banco local.");
    console.error("   Suba o ambiente e aplique as migrations:");
    console.error("     npx supabase start && npx supabase migration up --local");
    console.error(`\n   Erro: ${erro.message}\n`);
    process.exit(1);
  }

  const atual = fs.readFileSync(TYPES_FILE, "utf8");
  if (formatar(gerado) === formatar(atual)) {
    console.log("✓ Tipos do banco em dia com as migrations.");
    return;
  }

  console.error("\n✗ shared/src/database/database.types.ts divergiu do banco.");
  console.error(
    "\n   Alguma migration mudou o schema e os tipos não foram regenerados." +
      "\n   Enquanto durar, o compilador aprova consulta a coluna que não existe" +
      "\n   e o erro só aparece em runtime, como 42703 — quase sempre engolido" +
      "\n   por um catch que apenas loga.\n" +
      "\n   Corrija com:\n" +
      "     npx supabase migration up --local\n" +
      "     npm run db:types\n",
  );
  process.exit(1);
}

main();
