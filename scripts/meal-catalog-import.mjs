import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { buildMealCandidates } from "./meal-catalog/candidates.mjs";
import { loadProductionLedger, loadPublicFoods } from "./meal-catalog/checklist.mjs";
import { buildMealCatalogImport } from "./meal-catalog/import.mjs";

const [operation = "dry-run", filename] = process.argv.slice(2);

/** Exporta SQL sem segredo ou importa somente no banco local. @example node scripts/meal-catalog-import.mjs apply-local */
async function main() {
  if (
    !["dry-run", "apply-local", "export-sql"].includes(operation) ||
    (operation === "export-sql" && !filename)
  )
    throw new Error(
      `Operação inválida: ${operation}; esperado dry-run, apply-local ou export-sql <arquivo>.`,
    );
  const candidates = buildMealCandidates(await loadPublicFoods());
  const ledger = await loadProductionLedger();
  const payload = buildMealCatalogImport(candidates, ledger.completed);
  const literal = JSON.stringify(payload).replace(/'/g, "''");
  const apply = operation !== "dry-run";
  const sql = `SET client_encoding = 'UTF8';\nBEGIN;\nSELECT public.import_meal_catalog('${literal}'::jsonb, ${apply});\nCOMMIT;\n`;
  if (operation === "export-sql") {
    await writeFile(filename, sql, "utf8");
    console.log(
      JSON.stringify({
        mode: "exported",
        dishes: payload.dishes.length,
        images: payload.assets.length,
      }),
    );
    return;
  }
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_ElevaPro",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atq",
    ],
    { input: sql, encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Importação local recusada: ${result.stderr.trim()}; esperado transação válida.`,
    );
  console.log(result.stdout.trim());
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
