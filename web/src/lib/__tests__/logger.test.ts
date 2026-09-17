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
