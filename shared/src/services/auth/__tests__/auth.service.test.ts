import { describe, expect, it, vi } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createAuthService } from "../auth.service";

/** Sessão de mentira suficiente para o serviço decidir o que fazer. */
function sessaoDe(userId: string | null) {
  return {
    data: { user: userId ? { id: userId, email: "a@b.com" } : null },
    error: null,
  };
}

describe("authService — login com verificação de status", () => {
  // Este é o caminho que decide quem entra. A conta `inactive` é a que perdeu
  // acesso — recusada na aprovação ou desativada depois. Deixá-la entrar é
  // exatamente o defeito que o mobile tinha: comparava com "rejected" e
  // "suspended", valores que o enum nunca teve, e o ramo nunca executava.
  it("recusa conta inativa e encerra a sessão que acabou de abrir", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const { supabase } = criarSupabaseFake(
      { data: { account_status: "inactive" } },
      {
        auth: {
          signInWithPassword: async () => sessaoDe("u1"),
          signOut,
        },
      },
    );

    const resultado = await createAuthService(supabase).signInWithStatusCheck("a@b.com", "senha");

    expect(resultado).toEqual({ success: false, error: "account_inactive" });
    // Recusar sem deslogar deixaria a sessão válida no dispositivo: a tela
    // barraria e a próxima chamada ao banco passaria.
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("deixa entrar quem está ativo", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const { supabase } = criarSupabaseFake(
      { data: { account_status: "active" } },
      { auth: { signInWithPassword: async () => sessaoDe("u1"), signOut } },
    );

    expect(await createAuthService(supabase).signInWithStatusCheck("a@b.com", "senha")).toEqual({
      success: true,
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  // Quem espera aprovação precisa passar pelo login para chegar à tela de
  // pendência — barrar aqui deixaria o especialista novo sem caminho nenhum.
  it("deixa entrar quem está aguardando aprovação, para cair na tela de pendência", async () => {
    const { supabase } = criarSupabaseFake(
      { data: { account_status: "invited" } },
      { auth: { signInWithPassword: async () => sessaoDe("u1") } },
    );

    expect(await createAuthService(supabase).signInWithStatusCheck("a@b.com", "senha")).toEqual({
      success: true,
    });
  });

  it("devolve a mensagem do erro de credencial sem consultar o perfil", async () => {
    const { supabase, chamadas } = criarSupabaseFake(
      {},
      {
        auth: {
          signInWithPassword: async () => ({
            data: { user: null },
            error: { message: "Invalid login credentials" },
          }),
        },
      },
    );

    expect(await createAuthService(supabase).signInWithStatusCheck("a@b.com", "x")).toEqual({
      success: false,
      error: "Invalid login credentials",
    });
    expect(chamadas).toHaveLength(0);
  });

  // Perfil ausente não bloqueia: o trigger `handle_new_user` cria o registro no
  // insert em `auth.users`, e há uma janela em que ele ainda não foi lido.
  it("não bloqueia quando o perfil ainda não foi encontrado", async () => {
    const { supabase } = criarSupabaseFake(
      { data: null },
      { auth: { signInWithPassword: async () => sessaoDe("u1") } },
    );

    expect(await createAuthService(supabase).signInWithStatusCheck("a@b.com", "senha")).toEqual({
      success: true,
    });
  });

  it("consulta o status do usuário que acabou de autenticar", async () => {
    const { supabase, chamadas } = criarSupabaseFake(
      { data: { account_status: "active" } },
      { auth: { signInWithPassword: async () => sessaoDe("u-42") } },
    );

    await createAuthService(supabase).signInWithStatusCheck("a@b.com", "senha");

    expect(chamadas[0].tabela).toBe("profiles");
    expect(chamadas[0].select).toBe("account_status");
    expect(chamadas[0].filtros).toEqual({ id: "u-42" });
  });
});

describe("authService — perfil", () => {
  // O `account_type` sai de `profiles`, nunca de `user_metadata`: metadado de
  // auth é escrito pelo próprio usuário com `updateUser`, então confiar nele
  // deixa o chamador escolher o próprio papel (dívida #28).
  it("lê o perfil da tabela, não do metadado de autenticação", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { id: "u1", account_type: "specialist" },
    });

    await createAuthService(supabase).getProfile("u1");

    expect(chamadas[0].tabela).toBe("profiles");
    expect(chamadas[0].filtros).toEqual({ id: "u1" });
  });

  it("devolve null quando o perfil não existe, em vez de lançar", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "PGRST116" } });
    expect(await createAuthService(supabase).getProfile("u1")).toBeNull();
  });

  it("traz os serviços contratados junto do perfil do especialista", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { id: "u1", account_type: "specialist", specialist_services: [] },
    });

    await createAuthService(supabase).getProfileWithServices("u1");
    expect(chamadas[0].select).toContain("specialist_services");
  });
});

describe("authService — resumo do perfil", () => {
  // A tela inicial usava `select("*")` para mostrar nome e avatar: trazia email,
  // papel e status para o aparelho sem motivo. Minimização (LGPD, Art. 6°, III)
  // é pedir só o que a tela desenha.
  it("pede só id, nome e avatar, e não a linha inteira", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { id: "u1", full_name: "Ana", avatar_url: null },
    });

    const perfil = await createAuthService(supabase).getProfileSummary("u1");

    expect(chamadas[0].tabela).toBe("profiles");
    expect(chamadas[0].select).toBe("id, full_name, avatar_url");
    expect(chamadas[0].filtros).toEqual({ id: "u1" });
    expect(perfil).toEqual({ id: "u1", full_name: "Ana", avatar_url: null });
  });

  it("devolve null quando o perfil não existe, em vez de lançar", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createAuthService(supabase).getProfileSummary("u1")).toBeNull();
  });
});

describe("authService — definir tipo de conta", () => {
  it("manda o papel pela RPC do servidor", async () => {
    const { supabase, rpcs } = criarSupabaseFake({});

    await createAuthService(supabase).setAccountType({
      accountType: "student",
      fullName: "Ana",
    });

    expect(rpcs[0].nome).toBe("set_own_account_type");
    expect(rpcs[0].args[0]).toEqual({ p_account_type: "student", p_full_name: "Ana" });
  });

  // Regressão da escalada de privilégio de 2026-09-03. O UPDATE direto que
  // existia aqui gravava `account_type` escolhido pelo cliente, e a política
  // `profiles_update_own` o aceitava — RLS decide linha, não coluna. Qualquer
  // conta logada virava admin com um PATCH. A migration 0040 fechou a coluna;
  // este teste é o que impede a escrita direta de voltar por cima dela.
  it("não escreve em profiles por fora da RPC", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createAuthService(supabase).setAccountType({ accountType: "member" });

    expect(chamadas).toEqual([]);
  });

  // Sem id vindo de fora: quem é o usuário sai de `auth.uid()` no banco. Com o
  // id por parâmetro, quem chamasse escolheria de quem é o perfil que muda.
  it("não deixa o chamador dizer de quem é o perfil", async () => {
    const { supabase, rpcs } = criarSupabaseFake({});

    await createAuthService(supabase).setAccountType({ accountType: "member" });

    expect(JSON.stringify(rpcs[0].args)).not.toContain("id");
  });

  it("propaga erro em vez de seguir como se tivesse gravado", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(
      createAuthService(supabase).setAccountType({ accountType: "member" }),
    ).rejects.toEqual({ message: "42501" });
  });
});
