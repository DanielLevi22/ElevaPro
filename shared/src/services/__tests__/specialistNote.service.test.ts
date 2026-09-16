import { describe, expect, it } from "vitest";
import { createSpecialistNoteService } from "../specialistNote.service";
import { criarSupabaseFake } from "./supabaseFake";

const NOTA = {
  id: "n1",
  student_id: "aluno-1",
  specialist_id: "espec-1",
  body: "Progresso consistente.",
  created_at: "2026-09-10T12:00:00Z",
  updated_at: "2026-09-10T12:00:00Z",
};

describe("specialistNoteService — leitura", () => {
  it("lista as notas do aluno, da mais recente à mais antiga, com o autor", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: [{ ...NOTA, author: { full_name: "Ana" } }],
    });

    await expect(createSpecialistNoteService(supabase).listNotes("aluno-1")).resolves.toEqual([
      { ...NOTA, author_name: "Ana" },
    ]);
    expect(chamadas[0].tabela).toBe("specialist_notes");
    expect(chamadas[0].filtros.student_id).toBe("aluno-1");
  });

  // O embed do PostgREST chega como lista quando ele infere cardinalidade muitos,
  // e o nome do autor sumia da tela sem virar erro nenhum.
  it("lê o autor tanto embrulhado em objeto quanto em lista", async () => {
    const { supabase } = criarSupabaseFake({ data: [{ ...NOTA, author: [{ full_name: "Ana" }] }] });

    const [nota] = await createSpecialistNoteService(supabase).listNotes("aluno-1");

    expect(nota.author_name).toBe("Ana");
    expect(nota).not.toHaveProperty("author");
  });

  it("a nota do relatório é a última dentro do período", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { ...NOTA, author: null } });

    const nota = await createSpecialistNoteService(supabase).latestNoteInPeriod(
      "aluno-1",
      "2026-06-17",
      "2026-09-15",
    );

    expect(nota?.author_name).toBeNull();
    expect(chamadas[0].metodos.map((m) => m.nome)).toContain("maybeSingle");
    expect(chamadas[0].filtros).toMatchObject({ student_id: "aluno-1" });
  });

  it("sem nota no período, devolve nulo para o cartão sumir", async () => {
    const { supabase } = criarSupabaseFake({ data: null });

    await expect(
      createSpecialistNoteService(supabase).latestNoteInPeriod("aluno-1", "a", "b"),
    ).resolves.toBeNull();
  });

  // LGPD, Art. 6°, III. `*` traria para o cliente toda coluna que a tabela ganhar
  // depois — e o que ela guarda é texto clínico sobre uma pessoa.
  it("pede colunas nomeadas, nunca a tabela inteira", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createSpecialistNoteService(supabase).listNotes("aluno-1");

    if (chamadas[0].select?.includes("*")) {
      throw new Error(`COLUNA NÃO PEDIDA: o select da nota usa "*" (${chamadas[0].select})`);
    }
  });
});

describe("specialistNoteService — escrita", () => {
  it("escreve em nome de quem chama, sem espaço sobrando", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: NOTA });

    await createSpecialistNoteService(supabase).writeNote({
      studentId: "aluno-1",
      specialistId: "espec-1",
      body: "  Progresso consistente.  ",
    });

    expect(chamadas[0].payload).toEqual({
      student_id: "aluno-1",
      specialist_id: "espec-1",
      body: "Progresso consistente.",
    });
  });

  it("corrigir move o updated_at junto com o texto", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null, count: 1 });

    await createSpecialistNoteService(supabase).editNote("n1", "Outro texto.");

    expect(chamadas[0].payload).toMatchObject({ body: "Outro texto." });
    expect(chamadas[0].payload).toHaveProperty("updated_at");
    expect(chamadas[0].filtros.id).toBe("n1");
  });

  it("apaga pelo id, e a autoria quem confere é a RLS", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null, count: 1 });

    await createSpecialistNoteService(supabase).deleteNote("n1");

    expect(chamadas[0].metodos.map((m) => m.nome)).toContain("delete");
    expect(chamadas[0].filtros.id).toBe("n1");
  });

  // A RLS devolve zero linha em vez de erro. Sem esta checagem, corrigir a nota de
  // outro especialista terminava "com sucesso" e a tela seguia mostrando o texto
  // novo que o banco nunca guardou.
  it("a recusa silenciosa da RLS vira erro, ao corrigir e ao apagar", async () => {
    const service = createSpecialistNoteService(criarSupabaseFake({ count: 0 }).supabase);

    await expect(service.editNote("n1", "Outro texto.")).rejects.toThrow(/corrigir a nota/);
    await expect(
      createSpecialistNoteService(criarSupabaseFake({ count: 0 }).supabase).deleteNote("n1"),
    ).rejects.toThrow(/apagar a nota/);
  });

  it("propaga a recusa do banco", async () => {
    const { supabase } = criarSupabaseFake({ error: { code: "42501" } });

    await expect(
      createSpecialistNoteService(supabase).writeNote({
        studentId: "aluno-1",
        specialistId: "outro",
        body: "x",
      }),
    ).rejects.toEqual({ code: "42501" });
  });
});
