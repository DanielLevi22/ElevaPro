import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createLinkCodeService } from "../linkCode.service";

describe("o vínculo por código, nos dois sentidos", () => {
  it("o especialista gera o próprio código, apagando o anterior", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: null }, { data: null }]);
    const codigo = await createLinkCodeService(supabase).generate({
      role: "specialist",
      id: "espec-1",
    });

    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(chamadas.map((c) => c.tabela)).toEqual([
      "specialist_link_codes",
      "specialist_link_codes",
    ]);
    expect(chamadas[0].filtros).toEqual({ specialist_id: "espec-1" });
    expect(chamadas[1].payload).toMatchObject({ specialist_id: "espec-1", code: codigo });
  });

  it("o aluno gera o dele na tabela do aluno", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: null }, { data: null }]);
    await createLinkCodeService(supabase).generate({ role: "student", id: "aluno-1" });
    expect(chamadas[1].tabela).toBe("student_link_codes");
    expect(chamadas[1].payload).toMatchObject({ student_id: "aluno-1" });
  });

  it("cada lado resgata o código do outro pela função do banco", async () => {
    const { supabase, rpcs } = criarSupabaseFake([
      { data: { success: true } },
      { data: { success: true } },
    ]);
    const codigos = createLinkCodeService(supabase);
    await codigos.redeem("student", "K7Q2MX");
    await codigos.redeem("specialist", "A2B3C4");
    expect(rpcs.map((r) => r.nome)).toEqual(["link_to_specialist_by_code", "link_student_by_code"]);
  });
});
