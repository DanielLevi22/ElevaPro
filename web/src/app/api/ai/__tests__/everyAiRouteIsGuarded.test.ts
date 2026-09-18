import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const AI_ROUTES_DIR = join(__dirname, "..");

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

// Rota de IA gasta a conta da Anthropic e recebe corpo arbitrário. O limite de
// corpo e o rate limit durável vivem no rotaDeIA; duas rotas de aprovação já
// nasceram fora dele sem ninguém notar. Issue #322.
describe("rotas de IA", () => {
  it("nenhuma rota de IA exporta handler sem limite de corpo e rate limit", () => {
    const unguarded = routeFiles(AI_ROUTES_DIR)
      .filter((file) => !readFileSync(file, "utf8").includes("rotaDeIA("))
      .map((file) => relative(AI_ROUTES_DIR, file));

    expect(unguarded, "ROTA SEM LIMITE: handler de IA fora do rotaDeIA").toEqual([]);
  });
});
