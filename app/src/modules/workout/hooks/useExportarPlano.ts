import {
  buildPeriodizationSheet,
  createWorkoutsService,
  periodizationObjectiveLabel,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useState } from 'react';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { compartilharPlano, faixaDoPeriodo } from '../services/treinoPdf';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * Exporta o plano completo em PDF — periodização, fases, treinos, exercícios e
 * séries — pela folha de compartilhar. Busca tudo só na hora de exportar: a
 * tela das fases não carrega os treinos de todas elas.
 *
 * @example const { exportar, gerando } = useExportarPlano(periodizacao.id, especialista);
 */
export function useExportarPlano(periodizacaoId: string, especialista: string | null) {
  const aluno = useAuthStore(
    (estado) => estado.user?.user_metadata?.full_name as string | undefined
  );
  const [gerando, setGerando] = useState(false);

  const exportar = async () => {
    if (gerando) return;
    setGerando(true);
    const compartilhou = await gerarECompartilhar(periodizacaoId, aluno ?? 'Aluno', especialista);
    setGerando(false);
    if (!compartilhou) {
      showAlert({
        title: 'PDF não gerado',
        message: 'Não consegui gerar o PDF do plano. Tente de novo.',
        type: 'error',
      });
    }
  };

  return { exportar, gerando };
}

async function gerarECompartilhar(
  periodizacaoId: string,
  aluno: string,
  especialista: string | null
): Promise<boolean> {
  try {
    const completo = await servicoDeTreinos.fetchFullPeriodization(periodizacaoId);
    if (!completo) return false;
    const { periodization } = completo;
    const plano = buildPeriodizationSheet({
      ...completo,
      // O objetivo pelo rótulo da tela, não pelo código gravado.
      periodization: {
        ...periodization,
        objective: periodizationObjectiveLabel(periodization.objective),
      },
    });
    return compartilharPlano(
      plano,
      {
        documento: 'Plano de treino completo',
        aluno,
        especialista,
        vigencia: faixaDoPeriodo(periodization.start_date, periodization.end_date),
      },
      new Date().toLocaleString('pt-BR')
    );
  } catch {
    // A busca falhou antes do PDF: sem detalhe no log, como o compartilhar.
    return false;
  }
}
