import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("permite exibir fotos da origem configurada ao trocar o provedor", async () => {
  vi.stubEnv("MEAL_MEDIA_BASE_URL", "https://photos.example.test/catalog");
  vi.resetModules();
  const { default: config } = await import("../../../../next.config");
  const routes = await config.headers?.();
  const policy = routes?.[0].headers.find(({ key }) => key === "Content-Security-Policy")?.value;
  expect(policy).toContain("https://photos.example.test");
  expect(policy).not.toContain("https://photos.example.test/catalog");
  expect(policy).not.toContain("img-src *");
});

it("não libera origem de mídia configurada sem HTTPS", async () => {
  vi.stubEnv("MEAL_MEDIA_BASE_URL", "http://photos.example.test/catalog");
  vi.resetModules();
  const { default: config } = await import("../../../../next.config");
  const routes = await config.headers?.();
  const policy = routes?.[0].headers.find(({ key }) => key === "Content-Security-Policy")?.value;
  expect(policy).not.toContain("photos.example.test");
});
