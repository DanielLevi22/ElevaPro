import { createHealthService, type HealthDailyMetric } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useCallback, useEffect, useState } from 'react';

const healthService = createHealthService(supabase);

/** Quantos dias a tela olha para trás. Duas semanas cobrem a linha de base. */
export const DIAS_DE_HISTORICO = 14;

export interface HistoricoDeSaude {
  dias: HealthDailyMetric[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

function chaveLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * O histórico gravado do próprio aluno, do banco — não do relógio.
 *
 * `useHealthData` lê o aparelho e responde "como está hoje". Este lê o que foi
 * sincronizado e responde "como tem sido", que é a pergunta que sono e FC de
 * repouso existem para responder: um número isolado não diz nada, a linha de
 * base da própria pessoa diz tudo.
 *
 * Vem do banco de propósito, e não de outra leitura do aparelho: é o mesmo dado
 * que o especialista enxerga, então divergência entre as duas telas vira
 * conversa errada na próxima sessão.
 *
 * @example
 * const { dias, carregando } = useHistoricoDeSaude();
 */
export function useHistoricoDeSaude(): HistoricoDeSaude {
  const [dias, setDias] = useState<HealthDailyMetric[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setDias([]);
        setCarregando(false);
        return;
      }

      const fim = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - (DIAS_DE_HISTORICO - 1));

      setDias(await healthService.getRange(session.user.id, chaveLocal(inicio), chaveLocal(fim)));
      setErro(null);
    } catch (causa: unknown) {
      // Sem o valor no log: é dado de saúde e não pode ir para observabilidade
      // em texto claro (Art. 6°, VII).
      setErro('Não consegui carregar seu histórico.');
      console.log('[HistoricoDeSaude] falha ao carregar:', String(causa));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dias, carregando, erro, recarregar };
}
