import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../register/route";

/**
 * O cadastro de especialista precisa terminar com linha em
 * `specialist_services`. Sem ela o CASL nega dietas e treinos, e a conta existe
 * mas não serve para nada — foi o que aconteceu: a rota inseria o perfil que o
 * trigger `handle_new_user` já tinha criado, batia em chave duplicada, e o
 * `if (!profileError)` pulava justamente os serviços.
 */

const createUser = vi.fn();
const deleteUser = vi.fn();
const insert = vi.fn();
const from = vi.fn((_table: string) => ({ insert }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: (...args: unknown[]) => createUser(...args),
        deleteUser: (...args: unknown[]) => deleteUser(...args),
      },
    },
    from: (table: string) => from(table),
  },
}));

function request(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

const VALID = {
  email: "novo@elevapro.local",
  password: "senha-123456",
  full_name: "Novo Especialista",
  service_types: ["personal_training", "nutrition_consulting"],
};

beforeEach(() => {
  vi.clearAllMocks();
  createUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  insert.mockResolvedValue({ error: null });
});

describe("POST /api/auth/register", () => {
  it("grava um serviço por tipo escolhido", async () => {
    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith("specialist_services");
    expect(insert).toHaveBeenCalledWith([
      { specialist_id: "user-1", service_type: "personal_training" },
      { specialist_id: "user-1", service_type: "nutrition_consulting" },
    ]);
  });

  // O perfil é do trigger. Inserir de novo era o que quebrava o cadastro.
  it("não tenta criar o perfil — quem cria é o trigger", async () => {
    await POST(request(VALID));
    expect(from).not.toHaveBeenCalledWith("profiles");
  });

  // Conta que entra e não lê nada é pior que cadastro recusado: o usuário não
  // tem como saber que está pela metade.
  it("desfaz a conta quando os serviços falham", async () => {
    insert.mockResolvedValue({ error: { message: "boom" } });

    const res = await POST(request(VALID));

    expect(res.status).toBe(500);
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("exige os campos obrigatórios", async () => {
    const res = await POST(request({ ...VALID, service_types: [] }));

    expect(res.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("traduz e-mail já cadastrado", async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", code: "email_exists" },
    });

    const res = await POST(request(VALID));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Este e-mail já possui uma conta." });
  });
});
