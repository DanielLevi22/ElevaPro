import { mockSupabase, mockSupabaseBuilder } from '../../../../../jest.setup';

type Answer = { data: unknown; error: null };
type Builder = typeof mockSupabaseBuilder;
type Method = keyof Builder;

const WRITES = new Set<string>(['insert', 'update', 'delete', 'upsert']);

/**
 * Responde o mock do Supabase pela tabela e pela operação de cada consulta.
 *
 * Cada `from()` ganha o próprio builder: as telas leem e gravam em paralelo, e
 * um builder compartilhado deixava a resposta de uma consulta cair na outra.
 * As chamadas continuam registradas em `mockSupabaseBuilder`, onde os testes
 * conferem o que foi gravado.
 *
 * @example answerSupabase({ 'training_periodizations:insert': { id: 'p1' } });
 */
export function answerSupabase(answers: Record<string, unknown>) {
  (mockSupabase.from as jest.Mock).mockImplementation((table: string) => queryFor(table, answers));
}

function queryFor(table: string, answers: Record<string, unknown>): Builder {
  let operation = 'select';
  const query = {} as Record<Method, unknown>;
  for (const method of Object.keys(mockSupabaseBuilder) as Method[]) {
    if (method === 'then') continue;
    query[method] = (...args: unknown[]) => {
      (mockSupabaseBuilder[method] as (...a: unknown[]) => unknown)(...args);
      if (WRITES.has(method)) operation = method;
      return query;
    };
  }
  // biome-ignore lint/suspicious/noThenProperty: o builder do Supabase é um thenable
  query.then = (resolve: (answer: Answer) => unknown) =>
    resolve({ data: answers[`${table}:${operation}`] ?? null, error: null });
  return query as unknown as Builder;
}

/** Devolve o mock ao padrão do `jest.setup`, para o próximo teste. */
export function resetSupabaseAnswers() {
  mockSupabase.from.mockImplementation(() => mockSupabaseBuilder);
}
