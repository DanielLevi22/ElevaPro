import { buildWorkoutSheet, type Workout } from '@elevapro/shared';
import { useState } from 'react';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { useNomeDoEspecialista } from '@/hooks/useNomeDoEspecialista';
import { compartilharTreino } from '../services/treinoPdf';

/**
 * Exporta o treino em PDF, no papel do protocolo, pela folha de compartilhar.
 *
 * O PDF leva a prescrição do treino, e não as trocas de hoje: é o documento do
 * treino. "Desenvolvido por" é o especialista que prescreveu; no treino que o
 * próprio Praticante montou, o papel diz "plano próprio".
 *
 * @example const { exportar, gerando } = useExportarTreino(treino);
 */
export function useExportarTreino(treino: Workout) {
  const aluno = useAuthStore(
    (estado) => estado.user?.user_metadata?.full_name as string | undefined
  );
  const especialista = useNomeDoEspecialista(treino.specialist_id);
  const [gerando, setGerando] = useState(false);

  const exportar = async () => {
    if (gerando) return;
    setGerando(true);
    const folha = buildWorkoutSheet({ title: treino.title, exercises: treino.exercises ?? [] });
    const compartilhou = await compartilharTreino(
      folha,
      { aluno: aluno ?? 'Aluno', especialista, vigencia: null },
      new Date().toLocaleString('pt-BR')
    );
    setGerando(false);
    if (!compartilhou) {
      showAlert({
        title: 'PDF não gerado',
        message: 'Não consegui gerar o PDF do treino. Tente de novo.',
        type: 'error',
      });
    }
  };

  return { exportar, gerando };
}
