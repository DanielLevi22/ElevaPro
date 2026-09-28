import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("headers do web", () => {
  it("envia HSTS e uma política CSP que fecha objetos e frames", async () => {
    const rules = await nextConfig.headers?.();
    const headers = rules?.flatMap((rule) => rule.headers) ?? [];
    const header = (key: string) => headers.find((item) => item.key === key)?.value;

    expect(header("Strict-Transport-Security")).toContain("max-age=");
    expect(header("Content-Security-Policy")).toContain("object-src 'none'");
    expect(header("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(header("Content-Security-Policy")).toContain("https://cdn.jsdelivr.net");
    expect(header("Content-Security-Policy")).toContain("https://storage.googleapis.com");
  });
});
