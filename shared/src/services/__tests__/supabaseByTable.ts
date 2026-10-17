import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Duplo do Supabase que responde por tabela, e não pela ordem das chamadas.
 *
 * Existe para os serviços que juntam muitas consultas em `Promise.all`, uns
 * dentro dos outros (o relatório da semana, o do bloco, a jornada): a ordem
 * das chamadas muda quando um serviço de dentro muda, e o duplo por ordem
 * quebraria sem nada de errado. Aqui cada tabela tem as suas linhas.
 *
 * `maybeSingle` e `single` devolvem o objeto da tabela, ou a primeira linha
 * quando ela é uma lista; consulta com `head: true` devolve a contagem.
 *
 * @example
 * const { supabase, selects } = supabaseByTable({ rest_periods: [], plan_adjustments: [] });
 */
export interface TableAnswer {
  rows?: unknown;
  count?: number;
}

export function supabaseByTable(tables: Record<string, unknown | TableAnswer>): {
  supabase: SupabaseClient;
  /** As colunas pedidas, por tabela, para conferir o que foi lido. */
  selects: Record<string, string[]>;
} {
  const selects: Record<string, string[]> = {};
  const answerOf = (table: string): TableAnswer => {
    const value = tables[table];
    if (value && typeof value === "object" && ("rows" in value || "count" in value)) {
      return value as TableAnswer;
    }
    return { rows: value ?? [] };
  };

  const supabase = {
    from(table: string) {
      const answer = answerOf(table);
      let head = false;
      let single = false;
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of [
        "eq",
        "neq",
        "in",
        "gt",
        "gte",
        "lt",
        "lte",
        "is",
        "not",
        "or",
        "order",
        "limit",
        "range",
      ]) {
        builder[name] = chain;
      }
      builder.select = (columns: string, options?: { head?: boolean }) => {
        selects[table] = [...(selects[table] ?? []), columns];
        head = Boolean(options?.head);
        return builder;
      };
      builder.maybeSingle = () => {
        single = true;
        return builder;
      };
      builder.single = builder.maybeSingle;
      // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
      builder.then = (accept: (value: unknown) => unknown) => {
        if (head)
          return Promise.resolve({ data: null, count: answer.count ?? 0, error: null }).then(
            accept,
          );
        const rows = answer.rows;
        const data = single ? (Array.isArray(rows) ? (rows[0] ?? null) : rows) : rows;
        return Promise.resolve({ data, error: null, count: answer.count ?? null }).then(accept);
      };
      return builder;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, selects };
}
