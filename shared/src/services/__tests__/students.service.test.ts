import { describe, expect, it } from "vitest";
import { createStudentsService } from "../students.service";
import { criarSupabaseFake } from "./supabaseFake";

/** Uma linha de `student_specialists` com o perfil embutido. */
function vinculo(
  id: string,
  perfil: { id: string; full_name?: string | null },
  extras: Record<string, unknown> = {},
) {
  return {
    id,
    service_type: "personal_training",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    student: {
      id: perfil.id,
      // `in` e não `??`: o teste de nome ausente passa `null` de propósito, e
      // `??` o trocaria pelo padrão — o cenário sumiria sem ninguém notar.
      full_name: "full_name" in perfil ? perfil.full_name : "Ana",
      email: "ana@exemplo.com",
      avatar_url: null,
      account_status: "active",
    },
    ...extras,
  };
}

describe("studentsService — listagem", () => {
  // Um aluno com dois serviços contratados tem duas linhas em
  // `student_specialists`. Sem deduplicar, ele aparece duas vezes na lista — e
  // o especialista acha que tem o dobro de alunos.
  it("não repete o aluno que tem mais de um serviço contratado", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        vinculo("v1", { id: "a" }),
        vinculo("v2", { id: "a" }, { service_type: "nutrition_consulting" }),
        vinculo("v3", { id: "b", full_name: "Bruno" }),
      ],
      count: 3,
    });

    const { students } = await createStudentsService(supabase).fetchStudents("esp-1");
    expect(students.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("busca apenas vínculos ativos do especialista", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [], count: 0 });
    await createStudentsService(supabase).fetchStudents("esp-1");

    expect(chamadas[0].tabela).toBe("student_specialists");
    expect(chamadas[0].filtros).toEqual({ specialist_id: "esp-1", status: "active" });
  });

  // O embed nomeia a constraint porque `student_specialists` tem duas FKs para
  // `profiles`; sem o nome o PostgREST não sabe qual seguir.
  it("embute o perfil pela FK nomeada", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [], count: 0 });
    await createStudentsService(supabase).fetchStudents("esp-1");
    expect(chamadas[0].select).toContain("profiles!student_id");
  });

  it("filtra por nome quando há busca", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        vinculo("v1", { id: "a", full_name: "Ana Souza" }),
        vinculo("v2", { id: "b", full_name: "Bruno Lima" }),
      ],
      count: 2,
    });

    const { students } = await createStudentsService(supabase).fetchStudents("esp-1", {
      search: "bru",
    });
    expect(students.map((s) => s.full_name)).toEqual(["Bruno Lima"]);
  });

  // `full_name` é nulável no banco — o perfil nasce no signup sem nome. Buscar
  // não pode derrubar a listagem inteira por causa disso.
  it("não quebra buscando quando o aluno ainda não tem nome", async () => {
    const { supabase } = criarSupabaseFake({
      data: [vinculo("v1", { id: "a", full_name: null })],
      count: 1,
    });

    const { students } = await createStudentsService(supabase).fetchStudents("esp-1", {
      search: "ana",
    });
    expect(students).toEqual([]);
  });

  it("descarta vínculo cujo perfil não veio", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        { id: "v1", service_type: "personal_training", status: "active", student: null },
        vinculo("v2", { id: "b" }),
      ],
      count: 2,
    });

    const { students } = await createStudentsService(supabase).fetchStudents("esp-1");
    expect(students.map((s) => s.id)).toEqual(["b"]);
  });

  // A paginação vem do `count` do PostgREST, não do tamanho da página: com o
  // total errado, o número de páginas fica errado e o fim da lista some.
  it("usa o total da consulta, não o tamanho da página", async () => {
    const { supabase } = criarSupabaseFake({
      data: [vinculo("v1", { id: "a" })],
      count: 57,
    });

    const { total } = await createStudentsService(supabase).fetchStudents("esp-1", { limit: 20 });
    expect(total).toBe(57);
  });

  it("calcula o intervalo da página pedida", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [], count: 0 });
    await createStudentsService(supabase).fetchStudents("esp-1", { page: 3, limit: 20 });

    const range = chamadas[0].metodos.find((m) => m.nome === "range");
    expect(range?.args).toEqual([40, 59]);
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createStudentsService(supabase).fetchStudents("esp-1")).rejects.toEqual({
      message: "42501",
    });
  });
});

describe("studentsService — avaliação física", () => {
  // Regressão do DT-24: `physical_assessments` é sensível pela
  // LGPD_COMPLIANCE.md e a consulta usa a lista de colunas compartilhada.
  it("nomeia as colunas em vez de pedir tudo", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });
    await createStudentsService(supabase).fetchStudentDetails("aluno-1");

    expect(chamadas[0].tabela).toBe("physical_assessments");
    expect(chamadas[0].select).not.toBe("*");
    expect(chamadas[0].select).toContain("weight_kg");
  });

  // A avaliação é imutável por política (LGPD_COMPLIANCE.md seção 12): medida
  // errada se corrige com avaliação nova, não reescrevendo a antiga.
  it("registra nova avaliação em vez de atualizar a anterior", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createStudentsService(supabase).addPhysicalAssessment("aluno-1", "esp-1", {
      weight_kg: 80,
    });

    expect(chamadas[0].metodos.some((m) => m.nome === "insert")).toBe(true);
    expect(chamadas[0].metodos.some((m) => m.nome === "update")).toBe(false);
    expect(chamadas[0].payload).toEqual({
      student_id: "aluno-1",
      specialist_id: "esp-1",
      weight_kg: 80,
    });
  });

  it("propaga erro da gravação", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42703" } });
    await expect(
      createStudentsService(supabase).addPhysicalAssessment("aluno-1", "esp-1", { weight_kg: 80 }),
    ).rejects.toEqual({ message: "42703" });
  });
});

describe("studentsService — vínculos", () => {
  // Encerrar o vínculo é o que tira o acesso do especialista pela RLS. Marcar
  // sem o `ended_by` deixaria o histórico sem dizer quem encerrou.
  it("encerra registrando quem encerrou e quando", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createStudentsService(supabase).endStudentLink("v1", "aluno-1");

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.status).toBe("inactive");
    expect(payload.ended_by).toBe("aluno-1");
    expect(payload.ended_at).toEqual(expect.any(String));
  });

  // O filtro por `status = active` impede reencerrar um vínculo já encerrado,
  // o que sobrescreveria a data original.
  it("só encerra vínculo que ainda está ativo", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    await createStudentsService(supabase).endStudentLink("v1", "aluno-1");

    expect(chamadas[0].filtros).toEqual({
      id: "v1",
      student_id: "aluno-1",
      status: "active",
    });
  });

  it("lista apenas os vínculos ativos do aluno", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createStudentsService(supabase).fetchStudentLinks("aluno-1");

    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1", status: "active" });
  });

  it("devolve lista vazia sem vínculo, sem quebrar", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createStudentsService(supabase).fetchStudentLinks("aluno-1")).toEqual([]);
  });
});

describe("studentsService — últimas pesagens", () => {
  // A aderência mostra só a variação de peso. A avaliação física tem dobras,
  // circunferências e observações: pedir a linha inteira para ler um número é o
  // que o Art. 6°, III recusa, e o `select("*")` nem passa no pre-commit.
  it("lê só peso e data da avaliação, das mais recentes para trás", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createStudentsService(supabase).fetchUltimasPesagens("aluno-1", 2);

    expect(chamadas[0].tabela).toBe("physical_assessments");
    expect(chamadas[0].select).toBe("weight_kg, assessed_at");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
    expect(chamadas[0].metodos).toContainEqual({ nome: "limit", args: [2] });
  });

  it("sem avaliação, devolve lista vazia", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createStudentsService(supabase).fetchUltimasPesagens("aluno-1")).toEqual([]);
  });
});
