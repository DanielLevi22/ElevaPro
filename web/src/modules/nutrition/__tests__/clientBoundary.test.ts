import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, it } from "vitest";

const moduleRoot = resolve(process.cwd(), "src/modules/nutrition");

// Regex, e não o parser: o TypeScript 7 é nativo e não expõe mais a API de
// compilador em JS. Basta reconhecer a diretiva e os re-exports do barrel.
const LEADING_COMMENTS = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/;
const CLIENT_DIRECTIVE = /^["']use client["']/;
const RELATIVE_EXPORT = /^export\b[^;]*?\bfrom\s+["'](\.[^"']+)["']/gm;

function declaresClientBoundary(text: string): boolean {
  return CLIENT_DIRECTIVE.test(text.replace(LEADING_COMMENTS, ""));
}

it("exports públicos que usam hooks declaram a fronteira cliente para páginas servidor", () => {
  const entrypoint = resolve(moduleRoot, "index.ts");
  const specifiers = [...readFileSync(entrypoint, "utf8").matchAll(RELATIVE_EXPORT)].map(
    (match) => match[1],
  );
  expect(specifiers.length).toBeGreaterThan(0);
  for (const specifier of specifiers) {
    const text = readFileSync(resolve(dirname(entrypoint), `${specifier}.tsx`), "utf8");
    if (!/\buse[A-Z]\w*\s*\(/.test(text)) continue;
    // O barrel é importado por páginas servidor; hooks públicos precisam de uma fronteira própria.
    expect(declaresClientBoundary(text), `FRONTEIRA CLIENTE AUSENTE: ${specifier}`).toBe(true);
  }
});
