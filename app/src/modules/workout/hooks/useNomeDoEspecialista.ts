import { createAuthService, nomeCurto } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';

const servicoDeAuth = createAuthService(supabase);

/**
 * O nome curto do especialista do aluno: "Daniel L.".
 *
 * Só o nome curto, e só o do especialista que acompanha o aluno: a política
 * `profiles_read_own_and_linked` (migration 0016) deixa o aluno ler esse
 * perfil por `private.is_my_specialist`, e nenhuma tela do aluno precisa de
 * mais que isso. Serve o cartão do ciclo e o card de compartilhar.
 *
 * @example
 * const especialista = useNomeDoEspecialista(treino.specialist_id);
 */
export function useNomeDoEspecialista(especialistaId: string | null | undefined): string | null {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!especialistaId) return;
    let ativo = true;
    servicoDeAuth
      .getProfileSummary(especialistaId)
      .then((perfil) => {
        if (ativo) setNome(nomeCurto(perfil?.full_name));
      })
      .catch(() => {
        // Sem o nome o cartão segue sem ele: não é o assunto da tela.
      });
    return () => {
      ativo = false;
    };
  }, [especialistaId]);

  return nome;
}
