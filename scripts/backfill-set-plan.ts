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
 * Usa a chave `service_role`, porque precisa ler e gravar itens de todos os
 * especialistas. Ela vem do ambiente, nunca do código. Rodar de novo é seguro:
 * só os itens com plano nulo são lidos.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:backfill-set-plan
 */

import { createClient } from "@supabase/supabase-js";
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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável ${name} ausente. Esperado: a URL e a chave service_role do projeto.`);
  }
  return value;
}

async function main(): Promise<void> {
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false },
    },
  );
  let converted = 0;

  // Sempre a primeira página: cada lote gravado sai do filtro `set_plan is null`.
  for (;;) {
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("id, sets, reps, weight, rest_seconds, notes")
      .is("set_plan", null)
      .limit(PAGE_SIZE);
    if (error) throw new Error(`Leitura dos itens falhou: ${error.message}`);
    const items = (data ?? []) as FlatItem[];
    if (items.length === 0) break;

    for (const item of items) {
      const { error: updateError } = await supabase
        .from("workout_exercises")
        .update(setPlanFromFlatColumns(item))
        .eq("id", item.id);
      if (updateError)
        throw new Error(`Item ${item.id} não foi convertido: ${updateError.message}`);
    }
    converted += items.length;
    console.log(`${converted} itens convertidos até agora`);
  }

  console.log(`Pronto: ${converted} itens ganharam plano de séries. A 0106 já pode ser aplicada.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
