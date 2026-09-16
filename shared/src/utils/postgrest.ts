/**
 * O embed do PostgREST chega como objeto **ou** como lista, conforme a
 * cardinalidade que ele infere da chave estrangeira — e a inferência muda quando
 * o relacionamento muda.
 *
 * Quem lê só uma das formas perde o dado em silêncio: o nome do autor da nota
 * sumia da tela sem erro nenhum, e o exercício da série sumia do gráfico.
 *
 * @example firstOfEmbed(row.author)?.full_name ?? null
 */
export function firstOfEmbed<T>(embed: T | T[] | null | undefined): T | undefined {
  return Array.isArray(embed) ? embed[0] : (embed ?? undefined);
}
