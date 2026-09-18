import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redactForLog } from "../logger";

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("remove credenciais, conteúdo e dados pessoais inclusive quando estão aninhados", () => {
    const safe = redactForLog({
      trace_id: "trace-123",
      authorization: "Bearer segredo",
      nested: { email: "aluno@exemplo.com", health_score: 99 },
      failure: new Error("token=segredo"),
    });

    expect(safe).toEqual({
      trace_id: "trace-123",
      authorization: "[REDACTED]",
      nested: { email: "[REDACTED]", health_score: "[REDACTED]" },
      failure: { name: "Error" },
    });
  });

  // O PostgrestError não é Error, e o details dele cita a linha que falhou:
  // "Key (email)=(aluno@exemplo.com) already exists". LGPD, arts. 6º, VII e 46.
  it("não deixa e-mail escapar pelo details de um erro do banco", () => {
    const line = JSON.stringify(
      redactForLog({
        error: {
          message: "duplicate key value violates unique constraint",
          code: "23505",
          details: "Key (email)=(aluno@exemplo.com) already exists.",
          hint: null,
        },
      }),
    );

    expect(line, "E-MAIL NO LOG: details do erro do banco saiu em claro").not.toContain(
      "aluno@exemplo.com",
    );
    expect(JSON.parse(line)).toEqual({ error: { code: "23505" } });
  });

  it("mascara e-mail mesmo quando a chave parece inofensiva", () => {
    const safe = redactForLog({ reason: "convite recusado para aluno@exemplo.com" });

    expect(JSON.stringify(safe), "E-MAIL NO LOG: valor livre com e-mail em claro").not.toContain(
      "aluno@exemplo.com",
    );
  });

  // Medida corporal é dado de saúde (Art. 5º, II); log técnico não é base para tratá-la.
  it("remove medidas corporais e valores de métricas de saúde", () => {
    const safe = redactForLog({ weight: 82.5, height: 180, sleep_hours: 6, value: 61 });

    expect(safe, "MEDIDA NO LOG: valor de saúde saiu em claro").toEqual({
      weight: "[REDACTED]",
      height: "[REDACTED]",
      sleep_hours: "[REDACTED]",
      value: "[REDACTED]",
    });
  });

  it("emite JSON estruturado sem valores proibidos", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("ai.route.failed", {
      route: "/api/ai/chat",
      trace_id: "trace-123",
      token: "segredo",
    });

    const line = output.mock.calls[0]?.[0];
    expect(typeof line).toBe("string");
    expect(line).not.toContain("segredo");
    expect(JSON.parse(line as string)).toMatchObject({
      level: "error",
      event: "ai.route.failed",
      trace_id: "trace-123",
      token: "[REDACTED]",
    });
  });
});
