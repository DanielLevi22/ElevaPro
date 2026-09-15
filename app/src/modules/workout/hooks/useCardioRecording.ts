import type { HeartRateProfile, SessionVitals } from '@elevapro/shared';
import { useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { readSessionVitals } from '@/shared/wearable';
import type { CardioModality } from '../cardioModalities';
import type { CardioReading } from '../services/cardioMetrics';
import { vitalsIfConsented } from '../services/consentimento';
import { buildCardioSession, saveCardioSession } from '../services/registroDaSessao';
import type { CardioAction, CardioSessionState } from '../store/cardioSessionMachine';

interface RecordingInput {
  studentId: string;
  masquerading: boolean;
  modality: CardioModality | null;
  session: CardioSessionState;
  reading: CardioReading;
  profile: HeartRateProfile | null;
  dispatch: (action: CardioAction) => void;
  /** Encerra o GPS e os passos e apaga as posições da memória. */
  stopTracking: () => Promise<void>;
  onCardioSaved: () => void;
}

export interface CardioRecording {
  saving: boolean;
  /** A média e as zonas que foram lidas e gravadas, para o resumo. */
  vitals: SessionVitals | null;
  save: (perceivedExertion: number, notes: string) => Promise<void>;
  discard: () => Promise<void>;
}

/**
 * Salvar e descartar a sessão de cardio, no fim do feedback.
 *
 * Salvar lê o batimento da janela da sessão (só com consentimento), grava, e só
 * então encerra o rastreio: encerrar apaga as posições, e uma falha antes disso
 * deixaria o aluno sem a sessão e sem o traçado. O resumo só aparece depois de
 * gravado, porque ele afirma que a sessão foi salva.
 *
 * @example const recording = useCardioRecording({ studentId, session, reading, … });
 */
export function useCardioRecording(input: RecordingInput): CardioRecording {
  const [saving, setSaving] = useState(false);
  const [vitals, setVitals] = useState<SessionVitals | null>(null);

  const save = async (perceivedExertion: number, notes: string) => {
    const { modality, session, studentId } = input;
    if (!modality || session.startedAt === null || session.finishedAt === null) return;
    const { startedAt, finishedAt } = session;
    setSaving(true);
    try {
      // Mascarado, o aparelho é o do especialista: o relógio lido seria o dele, e
      // não o do aluno. Nada é gravado nesse modo, e nada é lido também.
      const read = input.masquerading
        ? null
        : await vitalsIfConsented(studentId, () =>
            readSessionVitals(
              new Date(startedAt),
              new Date(finishedAt),
              input.profile?.maxHeartRate ?? null
            )
          );
      const feedback = { studentId, perceivedExertion, notes };
      const toSave = buildCardioSession(modality, session, input.reading, feedback, read);
      await saveCardioSession(toSave, { mascarado: input.masquerading });
      await input.stopTracking();
      if (!input.masquerading) input.onCardioSaved();
      setVitals(read);
      input.dispatch({ type: 'saved' });
    } catch {
      // Sem o objeto de erro: o do PostgREST carrega o payload, e `notes` é saúde.
      showAlert({
        type: 'error',
        title: 'Sessão não salva',
        message: 'Não consegui salvar o cardio. Confira a conexão e tente de novo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    await input.stopTracking();
    input.dispatch({ type: 'discard' });
  };

  return { saving, vitals, save, discard };
}
