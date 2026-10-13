/**
 * Alterna um item de múltipla escolha em que uma opção exclui as outras:
 * "Nenhum" na triagem e no esporte. Marcar a exclusiva limpa o resto; marcar
 * outra coisa tira a exclusiva.
 *
 * @example toggleExclusive(['none'], 'diabetes', 'none') // ['diabetes']
 */
export function toggleExclusive<T>(selected: readonly T[], item: T, exclusive: T): T[] {
  if (selected.includes(item)) return selected.filter((current) => current !== item);
  if (item === exclusive) return [exclusive];
  return [...selected.filter((current) => current !== exclusive), item];
}
