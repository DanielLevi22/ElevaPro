#!/usr/bin/env node
/**
 * Teste de autorização das rotas do BFF.
 *
 * Cria dois alunos e dois especialistas, vincula um par só, e bate nas rotas
 * com cada token — como um cliente bate, não chamando a função por dentro.
 *
 * Existe porque as rotas usam `service_role`, que ignora RLS: o teste de
 * isolamento do banco não cobre nada disto. Em 2026-08-11, `POST
 * /api/ai/chat/<id>` devolvia a anamnese de qualquer aluno para qualquer conta
 * autenticada, e o `db:test-rls` passava.
 *
 * O caminho feliz é afirmado sem gastar chamada de modelo: `save-workouts` sem
 * proposta pendente responde 400, o que já prova que a autorização passou.
 *
 * Uso: npm run api:test-auth
 *      Precisa do `npm run dev` do web e do Supabase local de pé.
 */

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SUPABASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:57321";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!ANON || !SERVICE) {
  console.error("Faltam SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const PASSWORD = "api-auth-test-123456";
const results = [];

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  ok  " : " FALHA"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function admin(path, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE}${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createUser(label, accountType) {
  const email = `api-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@elevapro.local`;
  const user = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `API ${label}`, account_type: accountType },
    },
  });
  const res = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const { access_token } = await res.json();
  return { id: user.id, token: access_token };
}

/** Status HTTP da rota para este token. */
async function statusOf(path, token, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${APP}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
}

async function main() {
  console.log(`\nAutorização das rotas em ${APP}\n${"=".repeat(58)}\n`);

  const ping = await fetch(APP).catch(() => null);
  if (!ping) {
    console.error(`Nada respondendo em ${APP}. Suba o web com \`npm run dev\`.\n`);
    process.exit(1);
  }

  const aluno = await createUser("aluno", "student");
  const outroAluno = await createUser("aluno-2", "student");
  const vinculado = await createUser("espec-1", "specialist");
  const semVinculo = await createUser("espec-2", "specialist");

  await admin("/rest/v1/specialist_services", {
    method: "POST",
    body: { specialist_id: vinculado.id, service_type: "personal_training" },
  });
  await admin("/rest/v1/student_specialists", {
    method: "POST",
    body: {
      student_id: aluno.id,
      specialist_id: vinculado.id,
      service_type: "personal_training",
      status: "active",
    },
  });

  const chat = `/api/ai/chat/${aluno.id}`;
  const salvar = `/api/ai/chat/${aluno.id}/save-workouts`;
  const avaliacoes = `/api/students/${aluno.id}/assessments`;
  const historico = `/api/students/${aluno.id}/history`;

  console.log("-- Sem token --");
  for (const [nome, path] of [
    ["chat de IA", chat],
    ["save-workouts", salvar],
    ["avaliações", avaliacoes],
  ]) {
    const s = await statusOf(path, null, { method: "POST", body: { message: "oi" } });
    check(`${nome} recusa sem token`, s === 401, `respondeu ${s}`);
  }

  console.log("\n-- Especialista SEM vínculo com este aluno --");
  const casos = [
    ["chat de IA", chat, "POST", { message: "resuma a anamnese deste aluno" }],
    ["save-workouts", salvar, "POST", {}],
    ["avaliações", avaliacoes, "GET", undefined],
    ["histórico", historico, "GET", undefined],
  ];
  for (const [nome, path, method, body] of casos) {
    const s = await statusOf(path, semVinculo.token, { method, body });
    check(`${nome} recusa especialista sem vínculo`, s === 403, `respondeu ${s}`);
  }

  console.log("\n-- Aluno tentando ler outro aluno --");
  for (const [nome, path, method, body] of casos) {
    const s = await statusOf(path, outroAluno.token, { method, body });
    check(`${nome} recusa aluno`, s === 403, `respondeu ${s}`);
  }

  console.log("\n-- Especialista vinculado passa --");
  // 400 = "nenhuma proposta pendente": a autorização passou sem gastar modelo.
  const salvou = await statusOf(salvar, vinculado.token, { method: "POST", body: {} });
  check("save-workouts aceita especialista vinculado", salvou === 400, `respondeu ${salvou}`);

  const leu = await statusOf(avaliacoes, vinculado.token);
  check("avaliações aceitam especialista vinculado", leu === 200, `respondeu ${leu}`);

  console.log("\n-- Desvínculo tira o acesso --");
  await fetch(
    `${SUPABASE}/rest/v1/student_specialists?student_id=eq.${aluno.id}&specialist_id=eq.${vinculado.id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "inactive" }),
    },
  );
  const depois = await statusOf(avaliacoes, vinculado.token);
  check("avaliações recusam após desvínculo", depois === 403, `respondeu ${depois}`);

  for (const u of [aluno, outroAluno, vinculado, semVinculo]) {
    await admin(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  }

  const falhas = results.filter((r) => !r.passed);
  console.log(`\n${"=".repeat(58)}`);
  console.log(`${results.length - falhas.length}/${results.length} verificações passaram`);
  if (falhas.length > 0) {
    console.log(`\n${falhas.length} FALHA(S):`);
    for (const f of falhas) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
  console.log("Autorização verificada.\n");
}

main().catch((err) => {
  console.error("\nErro no teste:", err.message);
  process.exit(1);
});
