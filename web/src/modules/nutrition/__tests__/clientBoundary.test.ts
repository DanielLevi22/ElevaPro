import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const moduleRoot = resolve(process.cwd(), "src/modules/nutrition");

function parseSource(filename: string): ts.SourceFile {
  return ts.createSourceFile(
    filename,
    readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

function declaresClientBoundary(source: ts.SourceFile): boolean {
  const statement = source.statements[0];
  return (
    ts.isExpressionStatement(statement) &&
    ts.isStringLiteral(statement.expression) &&
    statement.expression.text === "use client"
  );
}

it("exports públicos que usam hooks declaram a fronteira cliente para páginas servidor", () => {
  const entrypoint = resolve(moduleRoot, "index.ts");
  const exportedModules = parseSource(entrypoint).statements.filter(ts.isExportDeclaration);
  for (const exportedModule of exportedModules) {
    const specifier = exportedModule.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier)) continue;
    const filename = resolve(dirname(entrypoint), `${specifier.text}.tsx`);
    const source = parseSource(filename);
    if (!/\buse[A-Z]\w*\s*\(/.test(source.text)) continue;
    // O barrel é importado por páginas servidor; hooks públicos precisam de uma fronteira própria.
    expect(declaresClientBoundary(source), `FRONTEIRA CLIENTE AUSENTE: ${specifier.text}`).toBe(
      true,
    );
  }
});
