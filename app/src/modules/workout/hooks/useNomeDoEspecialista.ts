import { createAuthService, nomeCurto } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { skipToken, useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const servicoDeAuth = createAuthService(supabase);

/**
 * O nome curto do especialista do aluno: "Daniel L.".
 *
 * Só o nome curto, e só o do especialista que acompanha o aluno: a política
 * `profiles_read_own_and_linked` (migration 0016) deixa o aluno ler esse
 * perfil por `private.is_my_specialist`, e nenhuma tela do aluno precisa de
 * mais que isso. Serve o cartão da periodização e o card de compartilhar.
 * Sem o nome, o cartão segue sem ele: não é o assunto da tela.
 *
 * @example
 * const especialista = useNomeDoEspecialista(treino.specialist_id);
 */
export function useNomeDoEspecialista(especialistaId: string | null | undefined): string | null {
  const { data } = useQuery({
    queryKey: ['nomeDoEspecialista', especialistaId],
    queryFn: especialistaId
      ? () =>
          avisandoSeFalhar('especialista.lerNome', async () =>
            nomeCurto((await servicoDeAuth.getProfileSummary(especialistaId))?.full_name)
          )
      : skipToken,
  });
  return data ?? null;
}
