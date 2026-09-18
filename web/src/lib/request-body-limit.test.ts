import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { enforceRequestBodyLimit } from "./request-body-limit";

function requestWithBody(body: string): NextRequest {
  return new NextRequest("http://localhost/api/ai/test", { method: "POST", body });
}

describe("enforceRequestBodyLimit", () => {
  it("recusa o corpo acima do limite mesmo sem content-length confiável", async () => {
    const request = requestWithBody("12345");

    const response = await enforceRequestBodyLimit(request, 4);

    expect(response?.status).toBe(413);
    await expect(response?.json()).resolves.toEqual({ error: "payload_too_large" });
  });

  it("preserva o corpo para o handler após inspecioná-lo", async () => {
    const request = requestWithBody('{"message":"olá"}');

    const response = await enforceRequestBodyLimit(request, 100);

    expect(response).toBeNull();
    await expect(request.json()).resolves.toEqual({ message: "olá" });
  });
});
