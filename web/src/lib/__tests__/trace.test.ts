import { describe, expect, it } from "vitest";
import { attachTraceId, traceIdForRequest } from "../trace";

describe("trace id", () => {
  it("preserva somente o identificador W3C válido", () => {
    const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
    const request = new Request("https://elevapro.test/api", {
      headers: { traceparent: `00-${traceId}-00f067aa0ba902b7-01` },
    });

    expect(traceIdForRequest(request)).toBe(traceId);
  });

  it("descarta cabeçalho inválido e gera identificador opaco", () => {
    const traceId = traceIdForRequest(
      new Request("https://elevapro.test/api", { headers: { traceparent: "dados-do-cliente" } }),
    );

    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(traceId).not.toContain("dados-do-cliente");
  });

  it("retorna o identificador somente no cabeçalho de resposta", () => {
    const response = attachTraceId(Response.json({ error: "unavailable" }), "a".repeat(32));

    expect(response.headers.get("X-Request-Id")).toBe("a".repeat(32));
  });
});
