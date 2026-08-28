import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Duplo de teste do cliente Supabase.
 *
 * Os serviços de `shared/` recebem o cliente por parâmetro e encadeiam chamadas
 * do PostgREST (`.from().select().eq()...`). Testar isso sem um duplo comum
 * significa remontar o encadeamento em cada arquivo — e foi o que manteve sete
 * dos oito serviços sem teste: o custo de começar era alto demais.
 *
 * Duas decisões que fazem o duplo valer:
 *
 * 1. **A resposta é fixada no `.from()`**, pela ordem das chamadas, e não no
 *    momento em que a promise resolve. Sem isso, um `Promise.all` — que
 *    `briefing.service` usa para cinco consultas — devolveria as respostas em
 *    ordem imprevisível e o teste ficaria intermitente.
 *
 * 2. **Tudo que foi chamado fica registrado.** O que importa nestes serviços
 *    não é só o que devolvem: é *qual tabela* consultaram, *quais colunas*
 *    pediram e *o que* mandaram gravar. É assim que um teste pega coluna
 *    inexistente e `select("*")` em tabela sensível.
 *
 * @example
 * const { supabase, chamadas } = criarSupabaseFake([{ data: [{ id: "1" }] }]);
 * await createHealthService(supabase).getDay("aluno-1", "2026-08-28");
 * expect(chamadas[0].tabela).toBe("health_daily_metrics");
 */

export interface RespostaFake {
  data?: unknown;
  error?: unknown;
  count?: number;
}

export interface ChamadaRegistrada {
  tabela: string;
  /** Cada método encadeado, na ordem. */
  metodos: { nome: string; args: unknown[] }[];
  /** O argumento do `.select()`, quando houve. */
  select?: string;
  /** O corpo do `insert`/`update`/`upsert`, quando houve. */
  payload?: unknown;
  /** Filtros como `{ coluna: valor }`, para asserção legível. */
  filtros: Record<string, unknown>;
}

const ESCRITAS = new Set(["insert", "update", "upsert", "delete"]);
const FILTROS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "contains"]);

export interface SupabaseFake {
  supabase: SupabaseClient;
  /** Uma entrada por `.from()`, na ordem em que foram chamados. */
  chamadas: ChamadaRegistrada[];
  /** Uma entrada por `.rpc()`. */
  rpcs: { nome: string; args: unknown[] }[];
}

/**
 * @param respostas Uma por `.from()`/`.rpc()`, na ordem. Se acabarem, a última
 *   se repete — útil quando várias consultas devolvem a mesma coisa.
 */
export function criarSupabaseFake(
  respostas: RespostaFake | RespostaFake[] = {},
  extras: { auth?: Record<string, unknown> } = {},
): SupabaseFake {
  const fila = Array.isArray(respostas) ? respostas : [respostas];
  const chamadas: ChamadaRegistrada[] = [];
  const rpcs: { nome: string; args: unknown[] }[] = [];
  let consumidas = 0;

  const respostaPara = (indice: number): RespostaFake =>
    fila.length === 0 ? {} : (fila[Math.min(indice, fila.length - 1)] ?? {});

  function criarBuilder(indice: number, registro: ChamadaRegistrada) {
    const resolvida = () => {
      const r = respostaPara(indice);
      return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
    };

    const builder: Record<string, unknown> = {
      // O builder do PostgREST é thenable de verdade: `await query` sem
      // terminal resolve. O duplo precisa reproduzir isso para os serviços que
      // fazem `const { data } = await supabase.from(x).select(y)` funcionarem.
      // biome-ignore lint/suspicious/noThenProperty: é o contrato que está sendo imitado, não um acidente
      then: (aceita: (v: unknown) => unknown, recusa?: (e: unknown) => unknown) =>
        Promise.resolve(resolvida()).then(aceita, recusa),
    };

    const encadeia = (nome: string) => {
      builder[nome] = (...args: unknown[]) => {
        registro.metodos.push({ nome, args });
        if (nome === "select" && typeof args[0] === "string") registro.select = args[0];
        if (ESCRITAS.has(nome) && args.length > 0) registro.payload = args[0];
        if (FILTROS.has(nome) && typeof args[0] === "string") {
          registro.filtros[args[0]] = args[1];
        }
        return builder;
      };
    };

    for (const nome of [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "order",
      "limit",
      "range",
      "not",
      "or",
      "match",
      "filter",
      "returns",
      "overrideTypes",
      ...FILTROS,
    ]) {
      encadeia(nome);
    }

    // Terminais: resolvem em vez de encadear.
    for (const nome of ["single", "maybeSingle", "csv"]) {
      builder[nome] = (...args: unknown[]) => {
        registro.metodos.push({ nome, args });
        return Promise.resolve(resolvida());
      };
    }

    return builder;
  }

  const supabase = {
    from: (tabela: string) => {
      const registro: ChamadaRegistrada = { tabela, metodos: [], filtros: {} };
      chamadas.push(registro);
      return criarBuilder(consumidas++, registro);
    },
    rpc: (nome: string, ...args: unknown[]) => {
      rpcs.push({ nome, args });
      const indice = consumidas++;
      const r = respostaPara(indice);
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      ...(extras.auth ?? {}),
    },
  } as unknown as SupabaseClient;

  return { supabase, chamadas, rpcs };
}
