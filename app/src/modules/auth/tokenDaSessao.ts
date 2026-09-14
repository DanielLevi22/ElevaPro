import { useAuthStore } from './store/authStore';

/**
 * O token da sessão na hora da chamada, ou vazio sem login — a rota do BFF
 * recusa o vazio. Para passar como `obterToken` às telas dos módulos, que não
 * importam o de auth.
 *
 * @example <EscanearPratoScreen alunoId={user.id} obterToken={tokenDaSessao} />
 */
export function tokenDaSessao(): string {
  return useAuthStore.getState().session?.access_token ?? '';
}
