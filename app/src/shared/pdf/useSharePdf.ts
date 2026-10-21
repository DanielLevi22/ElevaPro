import { useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';

/**
 * O botão "exportar em PDF": trava o toque repetido enquanto gera e avisa se a
 * folha não abriu. Quem chama só diz como montar e compartilhar o documento.
 *
 * @example const { exportPdf, generating } = useSharePdf(() => shareWorkout(...), 'Não consegui gerar o PDF do treino. Tente de novo.');
 */
export function useSharePdf(share: () => Promise<boolean>, failureMessage: string) {
  const [generating, setGenerating] = useState(false);

  const exportPdf = async () => {
    if (generating) return;
    setGenerating(true);
    const shared = await share();
    setGenerating(false);
    if (!shared) showAlert({ title: 'PDF não gerado', message: failureMessage, type: 'error' });
  };

  return { exportPdf, generating };
}
