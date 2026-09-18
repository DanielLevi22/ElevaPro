import { describe, expect, it } from "vitest";
import { isAdminSessionAllowed } from "./admin-access";

describe("isAdminSessionAllowed", () => {
  it("não libera o painel administrativo para admin em AAL1", () => {
    expect(isAdminSessionAllowed("admin", false)).toBe(false);
  });

  it("libera o painel administrativo somente para admin em AAL2", () => {
    expect(isAdminSessionAllowed("admin", true)).toBe(true);
  });
});
