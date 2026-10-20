/**
 * Versão do deploy: o commit curto que a Vercel injeta. Fora dela é `"dev"`,
 * e o vigia de versão não age, para o `next dev` não recarregar sozinho.
 *
 * O build grava esta versão no cliente (`next.config.ts`) e `/api/version` a
 * devolve em tempo de execução; as duas saem desta função para não divergirem.
 *
 * @example
 * appVersionFrom(process.env.VERCEL_GIT_COMMIT_SHA) // "a951a3d"
 */
export function appVersionFrom(commitSha: string | undefined): string {
  return commitSha ? commitSha.slice(0, 7) : "dev";
}
