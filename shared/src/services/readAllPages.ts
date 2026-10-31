/** O PostgREST corta cada resposta em mil linhas. */
const PAGE_SIZE = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Lê até a página vir incompleta. Sem isto, a consulta que passa de mil linhas
 * volta cortada sem erro nenhum.
 *
 * @example const linhas = await readAllPages((from, to) => supabase.from("meal_logs").select("id").range(from, to));
 */
export async function readAllPages<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}
