import { afterEach, expect, it, vi } from "vitest";

const { createBrowserClient } = vi.hoisted(() => ({ createBrowserClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.resetModules();
  vi.clearAllMocks();
});

it("web usa o mesmo projeto Supabase que o BFF mesmo com variáveis Expo presentes", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://web.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "web-anon-key";
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://mobile.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "mobile-anon-key";

  await import("./client");

  expect(createBrowserClient).toHaveBeenCalledWith("https://web.supabase.co", "web-anon-key");
});
