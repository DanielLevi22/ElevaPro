/**
 * Log de falha em JSON estruturado, como o CLAUDE.md pede para observabilidade.
 *
 * O contexto só aceita valores escalares, e isso é deliberado: nunca um objeto
 * de erro nem uma linha do banco. O erro do PostgREST carrega o payload da
 * linha, e o payload das tabelas de treino inclui `notes`, dado de saúde
 * (Art. 11). Quem registra diz o que falhou e com que chave, não o que havia
 * dentro.
 *
 * @example
 * registrarFalha('sessao.gravar', { tipo: 'forca' });
 * // {"nivel":"erro","evento":"sessao.gravar","tipo":"forca"}
 */
type ValorDoContexto = string | number | boolean | null;

export function registrarFalha(
  evento: string,
  contexto: Record<string, ValorDoContexto> = {}
): void {
  console.error(JSON.stringify({ nivel: 'erro', evento, ...contexto }));
}

/**
 * O mesmo, para o que falhou e tem saída: a tela segue sem o dado.
 *
 * @example registrarAviso('peso.ler', { caiuNoPadrao: true });
 */
export function registrarAviso(
  evento: string,
  contexto: Record<string, ValorDoContexto> = {}
): void {
  console.warn(JSON.stringify({ nivel: 'aviso', evento, ...contexto }));
}

/**
 * Roda a busca e, se ela falhar, registra o aviso e deixa o erro seguir — para
 * o TanStack Query marcar a falha. O erro em si não vai para o log.
 *
 * @example
 * queryFn: () => avisandoSeFalhar('peso.ler', () => servico.fetchPesoParaGasto(id)),
 */
export async function avisandoSeFalhar<T>(evento: string, buscar: () => Promise<T>): Promise<T> {
  try {
    return await buscar();
  } catch (erro) {
    registrarAviso(evento);
    throw erro;
  }
}
