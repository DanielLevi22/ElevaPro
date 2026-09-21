import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateStudentData } from "../../../types/students.types";
import { createStudentsService } from "../students.service";

const input: CreateStudentData = {
  specialist_id: "especialista-1",
  full_name: "Ana Souza",
  email: "ana@exemplo.com",
  service_types: ["personal_training"],
};

function supabaseWithSession(accessToken: string | null): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
      }),
    },
  } as unknown as SupabaseClient;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("studentsService.createStudent", () => {
  // Regressão do DT-04. Isto chamava `supabase.functions.invoke("create-student")`
  // e o diretório `supabase/functions/` nunca existiu no repositório — o cadastro
  // de aluno pelo mobile falhava em toda tentativa. O caminho correto é o mesmo
  // que o web usa: POST /api/students, autorizado por `authorizeSpecialist`.
  it("cria o aluno pelo BFF com o token da sessão", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, student_id: "aluno-9" }),
    });

    const service = createStudentsService(supabaseWithSession("token-abc"));
    const result = await service.createStudent(input);

    expect(result).toEqual({ success: true, studentId: "aluno-9" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/students");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });

  // No mobile não existe origem relativa: sem a base absoluta o fetch falharia.
  it("prefixa a URL com a base do BFF quando informada", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, student_id: "aluno-9" }),
    });

    const service = createStudentsService(supabaseWithSession("token-abc"), "https://app.exemplo");
    await service.createStudent(input);

    expect(fetchMock.mock.calls[0][0]).toBe("https://app.exemplo/api/students");
  });

  // A rota deriva o especialista do token, nunca do corpo — reenviar
  // `specialist_id` do cliente permitiria cadastrar aluno no nome de outro
  // especialista. `service_types` vai no corpo porque é escolha legítima do
  // chamador: a rota valida contra os próprios `specialist_services` dele.
  it("não envia specialist_id no corpo, e envia os tipos de acompanhamento escolhidos", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, student_id: "aluno-9" }),
    });

    const service = createStudentsService(supabaseWithSession("token-abc"));
    await service.createStudent(input);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      fullName: "Ana Souza",
      email: "ana@exemplo.com",
      serviceTypes: ["personal_training"],
    });
  });

  // ADR-0035: nenhuma senha atravessa o cliente rumo ao especialista definir
  // por outra pessoa — nem que alguém a acrescente ao construir o input.
  it("não envia senha no corpo, mesmo que o input carregue uma", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, student_id: "aluno-9" }),
    });

    const service = createStudentsService(supabaseWithSession("token-abc"));
    await service.createStudent({ ...input, password: "não deveria existir" } as never);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("password");
  });

  it("devolve a mensagem de erro da rota", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Email já cadastrado" }),
    });

    const service = createStudentsService(supabaseWithSession("token-abc"));
    expect(await service.createStudent(input)).toEqual({
      success: false,
      error: "Email já cadastrado",
    });
  });

  it("recusa sem sessão, sem chamar a rota", async () => {
    const service = createStudentsService(supabaseWithSession(null));

    expect(await service.createStudent(input)).toEqual({
      success: false,
      error: "Usuário não autenticado",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
