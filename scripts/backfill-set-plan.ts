#!/usr/bin/env tsx
/**
 * Preenche o plano de séries (`set_plan`) dos itens de treino que ainda só têm
 * o formato achatado (`sets`, `reps`, `weight`, `rest_seconds`), antes da 0106
 * apagar essas colunas (#431, fatia 5).
 *
 * A conversão é a do shared (`setPlanFromFlatColumns`), testada, e não SQL: ler
 * "8 a 12", "10 min" ou "corporal" em duas linguagens divergiria. O que não
 * couber no plano vai para a observação do item.
 *
 * Conecta direto no Postgres pelo `SUPABASE_DB_URL`, o mesmo secret com que o
 * `db push` aplica as migrations (#434): o backfill roda no workflow manual
 * `backfill-set-plan.yml` sem mais uma credencial, e no local contra o Docker.
 * Rodar de novo é seguro: só os itens com plano nulo são lidos.
 *
 * Uso:
 *   SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:47322/postgres npm run db:backfill-set-plan
 */

import postgres from "postgres";
import { setPlanFromFlatColumns } from "../shared/src/setPlan/simplePrescription";

const PAGE_SIZE = 500;

interface FlatItem {
  id: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

type Sql = postgres.Sql;

function databaseUrl(): string {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      "Variável SUPABASE_DB_URL ausente. Esperado: postgresql://usuario:senha@host:porta/banco " +
        "(no local, postgresql://postgres:postgres@127.0.0.1:47322/postgres).",
    );
  }
  return url;
}

/** O pooler do Supabase fala TLS; o Postgres do Docker local, não. */
function sslFor(url: string): false | "require" {
  return /@(127\.0\.0\.1|localhost)[:/]/.test(url) ? false : "require";
}

/** Converte uma página de itens sem plano e diz quantos eram. */
async function convertPage(sql: Sql): Promise<number> {
  const items = await sql<FlatItem[]>`
    SELECT id, sets, reps, weight, rest_seconds, notes
    FROM public.workout_exercises
    WHERE set_plan IS NULL
    LIMIT ${PAGE_SIZE}`;
  for (const item of items) {
    const { set_plan, notes } = setPlanFromFlatColumns(item);
    // `::text` antes do `::jsonb`: sem ele o driver vê o parâmetro como jsonb e
    // codifica a string de novo, e o plano vira um texto JSON em vez de lista.
    await sql`
      UPDATE public.workout_exercises
      SET set_plan = ${JSON.stringify(set_plan)}::text::jsonb, notes = ${notes}
      WHERE id = ${item.id}`;
  }
  return items.length;
}

async function main(): Promise<void> {
  const url = databaseUrl();
  const sql = postgres(url, { ssl: sslFor(url), max: 1 });
  let converted = 0;
  try {
    // Sempre a primeira página: cada item gravado sai do filtro `set_plan IS NULL`.
    for (let page = await convertPage(sql); page > 0; page = await convertPage(sql)) {
      converted += page;
      console.log(`${converted} itens convertidos até agora`);
    }
  } finally {
    await sql.end();
  }
  console.log(`Pronto: ${converted} itens ganharam plano de séries. A 0106 já pode ser aplicada.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
