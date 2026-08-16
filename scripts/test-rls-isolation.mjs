#!/usr/bin/env node
/**
 * Teste de isolamento de RLS.
 *
 * Cria dois alunos e dois especialistas, vincula apenas um par, semeia dado de
 * saúde para os dois alunos e verifica quem enxerga o quê — falando com o
 * PostgREST como a aplicação fala, não por dentro do banco.
 *
 * Existe porque "a migration tem CREATE POLICY" não prova nada: a auditoria de
 * 2026-08-11 encontrou 18 tabelas sem RLS num projeto cujo PRD de banco estava
 * marcado como done com a palavra "RLS" na descrição.
 *
 * Uso: node scripts/test-rls-isolation.mjs
 *      SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY do ambiente,
 *      com fallback para o local.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:57321";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!ANON || !SERVICE) {
  console.error("Faltam SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const PASSWORD = "rls-isolation-test-123456";
const results = [];

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  ok  " : " FALHA"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, { token = SERVICE, method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: token === SERVICE ? SERVICE : ANON,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data: json };
}

async function createUser(label, accountType) {
  const email = `rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@elevapro.local`;
  const { data } = await api("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `RLS ${label}`, account_type: accountType },
    },
  });
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const { access_token } = await res.json();
  return { id: data.id, email, token: access_token };
}

/** Quantas linhas deste aluno o portador do token consegue ver. */
async function rowsOf(table, token, studentId) {
  const { ok, data } = await api(`/rest/v1/${table}?select=id&student_id=eq.${studentId}`, {
    token,
  });
  return ok && Array.isArray(data) ? data.length : -1;
}

async function main() {
  console.log(`\nIsolamento de RLS em ${URL}\n${"=".repeat(58)}\n`);

  const alunoA = await createUser("aluno-a", "student");
  const alunoB = await createUser("aluno-b", "student");
  const espec1 = await createUser("espec-1", "specialist");
  const espec2 = await createUser("espec-2", "specialist");
  const admin = await createUser("admin", "admin");

  // `account_type` sai de `profiles`, não do `user_metadata` — foi a dívida 28.
  // Sem este update o "admin" do teste seria só um rótulo sem efeito, e o teste
  // passaria por não estar testando nada.
  await api(`/rest/v1/profiles?id=eq.${admin.id}`, {
    method: "PATCH",
    body: { account_type: "admin" },
  });

  // Vínculo só entre aluno A e especialista 1. Criado pelo service role, que é
  // o único caminho depois da 0016 — nem o aluno nem o especialista inserem.
  await api("/rest/v1/specialist_services", {
    method: "POST",
    body: { specialist_id: espec1.id, service_type: "personal_training" },
  });
  await api("/rest/v1/student_specialists", {
    method: "POST",
    body: {
      student_id: alunoA.id,
      specialist_id: espec1.id,
      service_type: "personal_training",
      status: "active",
    },
  });

  // Dado de saúde para os dois alunos, para que "zero linhas" signifique
  // bloqueio e não tabela vazia — a armadilha do primeiro teste que escrevi.
  for (const aluno of [alunoA, alunoB]) {
    await api("/rest/v1/student_anamnesis", {
      method: "POST",
      body: {
        student_id: aluno.id,
        responses: { teste: true },
        completed_at: new Date().toISOString(),
      },
    });
    await api("/rest/v1/workout_sessions", {
      method: "POST",
      body: { student_id: aluno.id, started_at: new Date().toISOString() },
    });
    await api("/rest/v1/body_scans", {
      method: "POST",
      // Sem `photo_front_url`: a coluna saiu na 0026, porque a análise não
      // guarda imagem (`ADR-010`). Enquanto ela esteve aqui, o insert falhava
      // com 42703 e as duas asserções de `body_scans` acusavam bloqueio de RLS
      // quando o problema era a semente não existir.
      body: { student_id: aluno.id, weight_kg: 80 },
    });
  }

  const sensiveis = ["student_anamnesis", "workout_sessions", "body_scans"];

  console.log(
    "Semente: A e B com anamnese, sessão e body scan; só A vinculado ao especialista 1\n",
  );

  console.log("-- O aluno vê o próprio dado --");
  for (const t of sensiveis) {
    check(`aluno A lê o próprio ${t}`, (await rowsOf(t, alunoA.token, alunoA.id)) === 1);
  }

  console.log("\n-- O aluno não vê dado de outro aluno --");
  for (const t of sensiveis) {
    const n = await rowsOf(t, alunoB.token, alunoA.id);
    check(`aluno B NÃO lê ${t} do aluno A`, n === 0, n > 0 ? `viu ${n}` : "");
  }

  console.log("\n-- O especialista vinculado vê --");
  for (const t of sensiveis) {
    check(`especialista 1 lê ${t} do aluno A`, (await rowsOf(t, espec1.token, alunoA.id)) === 1);
  }

  console.log("\n-- O especialista sem vínculo não vê --");
  for (const t of sensiveis) {
    const n = await rowsOf(t, espec2.token, alunoA.id);
    check(`especialista 2 NÃO lê ${t} do aluno A`, n === 0, n > 0 ? `viu ${n}` : "");
  }

  console.log("\n-- Admin não alcança dado de saúde --");
  // Administrar a plataforma é aprovar conta e ver métrica; não é ler a
  // anamnese de ninguém. Hoje nenhuma política concede acesso a admin — este
  // bloco é o que impede alguém de acrescentar uma sem perceber o que abre.
  const saudeFechadaAoAdmin = [
    "student_anamnesis",
    "physical_assessments",
    "health_daily_metrics",
    "meal_logs",
    "diet_plans",
    "body_scans",
    "workout_sessions",
  ];
  for (const t of saudeFechadaAoAdmin) {
    const n = await rowsOf(t, admin.token, alunoA.id);
    check(`admin NÃO lê ${t} do aluno A`, n === 0, n > 0 ? `viu ${n}` : "");
  }

  // O contraponto, sem o qual o bloco acima passaria por engano: o admin
  // precisa enxergar perfis, senão o painel não tem o que listar e "zero
  // linhas" viraria a resposta certa pelo motivo errado.
  const perfis = await api("/rest/v1/profiles?select=id&limit=5", { token: admin.token });
  check(
    "admin lê profiles (é o que o painel lista)",
    perfis.ok && (perfis.data?.length ?? 0) > 0,
    perfis.ok ? "" : `status ${perfis.status}`,
  );

  console.log("\n-- Escalonamento de privilégio --");
  const auto = await api("/rest/v1/student_specialists", {
    method: "POST",
    token: espec2.token,
    body: {
      student_id: alunoA.id,
      specialist_id: espec2.id,
      service_type: "personal_training",
      status: "active",
    },
  });
  check(
    "especialista 2 NÃO cria vínculo por INSERT direto",
    !auto.ok,
    auto.ok ? "INSERT aceito" : "",
  );

  const autoAluno = await api("/rest/v1/student_specialists", {
    method: "POST",
    token: alunoB.token,
    body: {
      student_id: alunoA.id,
      specialist_id: alunoB.id,
      service_type: "personal_training",
      status: "active",
    },
  });
  check("aluno B NÃO se vincula como especialista de A", !autoAluno.ok);

  const consent = await api(`/rest/v1/student_consents?student_id=eq.${alunoA.id}`, {
    method: "DELETE",
    token: alunoA.token,
  });
  const restou = await api(`/rest/v1/student_consents?select=id&student_id=eq.${alunoA.id}`, {
    token: SERVICE,
  });
  check(
    "consentimento não pode ser apagado pelo titular",
    !consent.ok || (restou.data?.length ?? 0) >= 0,
  );

  console.log("\n-- Avaliação física é imutável pelo cliente --");
  // Sem política de UPDATE, o PostgREST responde 204 e afeta zero linhas: a
  // chamada "dá certo" e nada muda. Por isso a asserção lê o valor de volta em
  // vez de olhar o status.
  await api("/rest/v1/physical_assessments", {
    method: "POST",
    token: espec1.token,
    body: { student_id: alunoA.id, specialist_id: espec1.id, weight_kg: 80 },
  });
  const criou = await api(
    `/rest/v1/physical_assessments?select=id,weight_kg&student_id=eq.${alunoA.id}`,
    { token: SERVICE },
  );
  check("especialista vinculado cria avaliação", (criou.data?.length ?? 0) === 1);

  const avaliacaoId = criou.data?.[0]?.id;
  await api(`/rest/v1/physical_assessments?id=eq.${avaliacaoId}`, {
    method: "PATCH",
    token: espec1.token,
    body: { weight_kg: 99 },
  });
  await api(`/rest/v1/physical_assessments?id=eq.${avaliacaoId}`, {
    method: "DELETE",
    token: espec1.token,
  });
  const depois = await api(`/rest/v1/physical_assessments?select=weight_kg&id=eq.${avaliacaoId}`, {
    token: SERVICE,
  });
  check("UPDATE não altera a avaliação", Number(depois.data?.[0]?.weight_kg) === 80);
  check("DELETE não apaga a avaliação", (depois.data?.length ?? 0) === 1);

  console.log("\n-- Vínculo pela RPC (o único caminho que restou) --");
  const codigo = `TEST${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await api("/rest/v1/specialist_services", {
    method: "POST",
    body: { specialist_id: espec2.id, service_type: "personal_training" },
  });
  await api("/rest/v1/student_link_codes", {
    method: "POST",
    body: {
      student_id: alunoB.id,
      code: codigo,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    },
  });

  const semCodigo = await api("/rest/v1/rpc/link_student_by_code", {
    method: "POST",
    token: espec2.token,
    body: { p_code: "NAOEXISTE" },
  });
  check("RPC recusa código inválido", semCodigo.data?.success === false);

  // O aluno não pode usar a RPC para virar especialista de alguém.
  const alunoTentando = await api("/rest/v1/rpc/link_student_by_code", {
    method: "POST",
    token: alunoA.token,
    body: { p_code: codigo },
  });
  check("RPC recusa chamador que não é especialista", alunoTentando.data?.success === false);

  const vinculou = await api("/rest/v1/rpc/link_student_by_code", {
    method: "POST",
    token: espec2.token,
    body: { p_code: codigo },
  });
  check(
    "RPC vincula com código válido",
    vinculou.data?.success === true,
    vinculou.data?.error ?? "",
  );
  check(
    "especialista 2 passa a ler o aluno B após vincular",
    (await rowsOf("student_anamnesis", espec2.token, alunoB.id)) === 1,
  );

  const codigoRestou = await api(`/rest/v1/student_link_codes?select=id&code=eq.${codigo}`, {
    token: SERVICE,
  });
  check("código é consumido no vínculo", (codigoRestou.data?.length ?? 1) === 0);

  console.log("\n-- Desvínculo tira o acesso na mesma consulta --");
  await api(
    `/rest/v1/student_specialists?student_id=eq.${alunoA.id}&specialist_id=eq.${espec1.id}`,
    { method: "PATCH", body: { status: "inactive" } },
  );
  for (const t of sensiveis) {
    const n = await rowsOf(t, espec1.token, alunoA.id);
    check(`especialista 1 perde ${t} após desvínculo`, n === 0, n > 0 ? `ainda vê ${n}` : "");
  }

  // Limpeza
  for (const u of [alunoA, alunoB, espec1, espec2]) {
    await api(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  }

  const falhas = results.filter((r) => !r.passed);
  console.log(`\n${"=".repeat(58)}`);
  console.log(`${results.length - falhas.length}/${results.length} verificações passaram`);
  if (falhas.length > 0) {
    console.log(`\n${falhas.length} FALHA(S):`);
    for (const f of falhas) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
  console.log("Isolamento verificado.\n");
}

main().catch((err) => {
  console.error("\nErro no teste:", err.message);
  process.exit(1);
});
