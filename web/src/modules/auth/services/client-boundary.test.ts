import { expect, it, vi } from "vitest";

vi.mock("@elevapro/supabase", () => ({ supabase: { auth: { mfa: {} } } }));
vi.mock("@/lib/supabase-admin", () => {
  throw new Error("CLIENTE ADMINISTRATIVO NO NAVEGADOR: import público carregou supabase-admin");
});

// O ponto de entrada usado pelas telas não pode inicializar credenciais de
// servidor nem criar um segundo cliente Auth no navegador (LGPD, art. 46).
it("serviços de autenticação do navegador não carregam o cliente administrativo", async () => {
  const services = await import("./index");
  expect(services.registerAccount).toBeTypeOf("function");
  expect(services.verifyTotp).toBeTypeOf("function");
});
