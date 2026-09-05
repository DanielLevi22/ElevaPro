import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que acontece quando o banco recusa a mensagem.
 *
 * `saveMessage` passou a devolver o id para a resposta poder ser reescrita
 * durante o turno, e no caminho o `error` do PostgREST ficou sem ser lido. Isso
 * importa mais aqui do que de costume: quem chama trata `null` como "não
 * gravou, tenta de novo no próximo pedaço", então um insert recusado faria a
 * resposta sumir da conversa em silêncio, tentando de novo a cada três
 * segundos, sem uma linha dizendo o motivo.
 */

const CONTEUDO = "Vou montar sua periodização considerando a lesão no ombro.";

let erroDoInsert: { message: string } | null;

vi.mock("@/lib/supabase-admin", () => {
  const builder: Record<string, unknown> = {};
  builder.insert = () => builder;
  builder.select = () => builder;
  builder.single = async () =>
    erroDoInsert ? { data: null, error: erroDoInsert } : { data: { id: "msg-1" }, error: null };
  builder.update = () => builder;
  builder.eq = async () => ({ data: null, error: null });
  return { supabaseAdmin: { from: () => builder } };
});

const { saveMessage } = await import("../chatService");
const { saveStudentMessage } = await import("../studentCoachService");

let logado: unknown[][];

beforeEach(() => {
  erroDoInsert = null;
  logado = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logado.push(args);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  ["saveMessage", (c: string) => saveMessage("sessao-1", "assistant", c)],
  ["saveStudentMessage", (c: string) => saveStudentMessage("sessao-1", "assistant", c)],
])("%s", (_nome, gravar) => {
  it("devolve o id quando grava", async () => {
    expect(await gravar(CONTEUDO)).toBe("msg-1");
  });

  it("não registra nada quando deu certo", async () => {
    await gravar(CONTEUDO);

    expect(logado).toEqual([]);
  });

  it("devolve nada quando o banco recusa", async () => {
    erroDoInsert = { message: "new row violates row-level security policy" };

    expect(await gravar(CONTEUDO)).toBeNull();
  });

  // Sem isto, a recusa é indistinguível de um insert que deu certo e não
  // retornou nada — e ninguém descobre por quê.
  it("registra o motivo quando o banco recusa", async () => {
    erroDoInsert = { message: "new row violates row-level security policy" };

    await gravar(CONTEUDO);

    expect(logado).toHaveLength(1);
    expect(JSON.stringify(logado[0])).toContain("row-level security");
    expect(JSON.stringify(logado[0])).toContain("sessao-1");
  });

  // A conversa carrega inferência sobre saúde de titular identificado
  // (LGPD_COMPLIANCE §4). A sessão identifica a linha; o conteúdo, não.
  it("o conteúdo da mensagem não vai para o log", async () => {
    erroDoInsert = { message: "falhou" };

    await gravar(CONTEUDO);

    expect(JSON.stringify(logado)).not.toContain("periodização");
    expect(JSON.stringify(logado)).not.toContain("ombro");
  });
});
