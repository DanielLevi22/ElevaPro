import { createHealthService, TECHNIQUE_PURPOSE } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useCallback, useEffect, useState } from 'react';

/**
 * O portão que antecede a câmera.
 *
 * Análise de Técnica tem consentimento **próprio** (`TECHNIQUE_PURPOSE`), e não o do body
 * scan: são finalidades distintas e o Art. 8°, §4° anula autorização genérica.
 * Empacotadas juntas, recusar a câmera contínua custaria ao aluno a avaliação
 * física e o acompanhamento de passos — e consentimento cuja recusa cobra
 * funcionalidade alheia não é livre. Ver a migration 0041.
 *
 * `null` enquanto não se sabe, e a tela trata isso como "ainda não": abrir a
 * câmera durante a consulta seria decidir antes de perguntar.
 */
export type EstadoDoConsentimento = 'consultando' | 'concedido' | 'ausente';

export interface ConsentimentoDaTecnica {
  estado: EstadoDoConsentimento;
  conceder: () => Promise<void>;
  erro: string | null;
}

export function useConsentimentoDaTecnica(studentId: string | null): ConsentimentoDaTecnica {
  const [estado, setEstado] = useState<EstadoDoConsentimento>('consultando');
  const [erro, setErro] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    if (!studentId) return;

    try {
      const tem = await createHealthService(supabase).hasCollectionConsent(
        studentId,
        TECHNIQUE_PURPOSE
      );
      setEstado(tem ? 'concedido' : 'ausente');
    } catch (e) {
      // Falha de consulta não é consentimento: some com a dúvida para o lado
      // seguro. Tratar erro como "concedido" abriria a câmera exatamente
      // quando não se sabe se pode.
      setEstado('ausente');
      setErro(e instanceof Error ? e.message : 'Não consegui verificar sua autorização.');
    }
  }, [studentId]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  const conceder = useCallback(async () => {
    if (!studentId) return;

    try {
      await createHealthService(supabase).grantCollectionConsent(studentId, TECHNIQUE_PURPOSE);
      setEstado('concedido');
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar sua autorização.');
    }
  }, [studentId]);

  return { estado, conceder, erro };
}
