import { dataCurtaDoInstante, formatarDuracao } from '@elevapro/shared';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { showConfirm } from '@/components/ui/appAlert';
import { ShareWorkoutModal } from '@/components/workout/ShareWorkoutModal';
import { ROUTES } from '@/navigation/types';
import { type CardioModality, cardioModality } from '../../cardioModalities';
import { useCardioAnnouncements } from '../../hooks/useCardioAnnouncements';
import {
  useHeartRateProfile,
  useLastCardio,
  useModalityHistory,
} from '../../hooks/useCardioHistory';
import { type CardioRecording, useCardioRecording } from '../../hooks/useCardioRecording';
import { useCardioSession } from '../../hooks/useCardioSession';
import { useMovementIntensity } from '../../hooks/useMovementIntensity';
import { usePesoDoAluno } from '../../hooks/usePesoDoAluno';
import { type RastreioDaCorrida, useRastreioDaCorrida } from '../../hooks/useRastreioDaCorrida';
import {
  type CardioReading,
  estimateCalories,
  formatKilometers,
} from '../../services/cardioMetrics';
import {
  type CardioAction,
  type CardioSessionState,
  elapsedMs,
} from '../../store/cardioSessionMachine';
import { FeedbackView } from './FeedbackView';
import { GoalView } from './GoalView';
import { LiveView } from './LiveView';
import { ModalityView } from './ModalityView';
import { RouteView } from './RouteView';
import { SelectModalityView } from './SelectModalityView';
import { SummaryView } from './SummaryView';

export interface CardioScreenProps {
  studentId: string;
  /** O especialista vendo o app como o aluno: a sessão não é gravada. */
  masquerading: boolean;
  /** Aluno com especialista: o feedback diz que o personal o lê. */
  hasSpecialist: boolean;
  /** Depois de gravar: a ofensiva do dia, que mora em outro módulo. */
  onCardioSaved: () => void;
}

/**
 * O fluxo de cardio em vidro do kit (issue #304): escolha, modalidade, meta,
 * sessão ao vivo, pausa, percurso, feedback e resumo.
 *
 * Esta tela liga a máquina (`cardioSessionMachine`) ao que mede — relógio, GPS,
 * passos, acelerômetro — e ao que grava; cada momento desenha a sua tela.
 *
 * @example <CardioScreen studentId={user.id} masquerading={false} hasSpecialist onCardioSaved={…} />
 */
export function CardioScreen(props: CardioScreenProps) {
  const { session, now, dispatch } = useCardioSession();
  const modality = session.modalityId ? cardioModality(session.modalityId) : null;
  const weightKg = usePesoDoAluno(props.studentId);
  const tracking = useRastreioDaCorrida({
    usesGps: modality?.usesGps ?? false,
    countsSteps: modality?.countsSteps ?? false,
  });
  const reading = useReading(session, now, modality, weightKg, tracking);
  useCardioAnnouncements({ session, now, met: modality?.met ?? 0, weightKg });
  const profile = useHeartRateProfile(props.studentId);
  const recording = useCardioRecording({
    ...props,
    modality,
    session,
    reading,
    profile,
    dispatch,
    stopTracking: tracking.encerrar,
  });
  useLeaveGuard(session, tracking.encerrar);

  return (
    <CardioMoment
      {...props}
      session={session}
      dispatch={dispatch}
      modality={modality}
      weightKg={weightKg}
      reading={reading}
      tracking={tracking}
      recording={recording}
    />
  );
}

function useReading(
  session: CardioSessionState,
  now: number,
  modality: CardioModality | null,
  weightKg: number,
  tracking: RastreioDaCorrida
): CardioReading {
  const elapsed = elapsedMs(session, now);
  return {
    elapsedMs: elapsed,
    calories: modality ? estimateCalories(modality.met, weightKg, elapsed) : 0,
    distanceMeters: tracking.distanceMeters,
    paceSecondsPerKm: tracking.paceSecondsPerKm,
    cadenceSpm: tracking.avgCadenceSpm,
    laps: session.lapMarks.length,
  };
}

/**
 * Sair pelo gesto ou pelo botão do sistema no meio da sessão perderia o cardio
 * sem aviso. A pergunta só existe do início ao feedback: antes não há nada
 * medido, e no resumo já está gravado.
 */
function useLeaveGuard(session: CardioSessionState, stopTracking: () => Promise<void>): void {
  const navigation = useNavigation();
  const inProgress = useRef(false);
  inProgress.current = ['live', 'paused', 'feedback'].includes(session.moment);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!inProgress.current) return;
        event.preventDefault();
        showConfirm({
          title: 'Sair sem salvar?',
          message: 'O tempo e o percurso desta sessão não serão gravados.',
          type: 'danger',
          confirmText: 'Sair',
          cancelText: 'Continuar',
          onConfirm: () => {
            // Sem liberar antes, o despacho dispararia este mesmo listener de novo.
            inProgress.current = false;
            void stopTracking();
            navigation.dispatch(event.data.action);
          },
        });
      }),
    [navigation, stopTracking]
  );
}

interface CardioMomentProps extends CardioScreenProps {
  session: CardioSessionState;
  dispatch: (action: CardioAction) => void;
  modality: CardioModality | null;
  weightKg: number;
  reading: CardioReading;
  tracking: RastreioDaCorrida;
  recording: CardioRecording;
}

function CardioMoment(props: CardioMomentProps) {
  const { session, dispatch, modality } = props;
  const router = useRouter();
  const lastCardio = useLastCardio(props.studentId);

  if (session.moment === 'select' || !modality) {
    return (
      <SelectModalityView
        lastCardio={lastCardio}
        onBack={router.back}
        onHistory={() => router.push(ROUTES.STUDENT.SESSION_HISTORY)}
        onChoose={(modalityId) => dispatch({ type: 'chooseModality', modalityId })}
        onRepeat={(modalityId, goalMinutes) =>
          dispatch({ type: 'repeatLast', modalityId, goalMinutes })
        }
      />
    );
  }
  switch (session.moment) {
    case 'modality':
      return <ModalityMoment {...props} modality={modality} />;
    case 'goal':
      return (
        <GoalView
          modality={modality}
          goalMinutes={session.goalMinutes}
          weightKg={props.weightKg}
          onBack={() => dispatch({ type: 'back' })}
          onConfirm={(minutes) => dispatch({ type: 'confirmGoal', minutes })}
        />
      );
    case 'live':
    case 'paused':
      return <RunningMoment {...props} modality={modality} />;
    case 'feedback':
      return (
        <FeedbackView
          modality={modality}
          summaryLine={summaryLine(modality, props.reading)}
          hasSpecialist={props.hasSpecialist}
          saving={props.recording.saving}
          onSave={props.recording.save}
          onDiscard={props.recording.discard}
        />
      );
    case 'summary':
      return <SummaryMoment {...props} modality={modality} />;
  }
}

function ModalityMoment(props: CardioMomentProps & { modality: CardioModality }) {
  const { modality, session, dispatch, tracking } = props;
  const history = useModalityHistory(props.studentId, modality);
  const start = useCallback(() => {
    dispatch({ type: 'start', now: Date.now() });
    void tracking.iniciar();
  }, [dispatch, tracking.iniciar]);

  return (
    <ModalityView
      modality={modality}
      goalMinutes={session.goalMinutes}
      weightKg={props.weightKg}
      history={history}
      onBack={() => dispatch({ type: 'back' })}
      onGoal={() => dispatch({ type: 'openGoal' })}
      onStart={start}
    />
  );
}

function RunningMoment(props: CardioMomentProps & { modality: CardioModality }) {
  const { modality, session, dispatch, tracking, reading } = props;
  const router = useRouter();
  const intensity = useMovementIntensity(session.moment === 'live');
  const finish = () => {
    dispatch({ type: 'finish', now: Date.now() });
    void tracking.pausar();
  };

  if (session.routeOpen) {
    return (
      <RouteView
        modality={modality}
        session={session}
        reading={reading}
        points={tracking.pontos}
        hasLocation={tracking.temLocalizacao}
        onClose={() => dispatch({ type: 'closeRoute' })}
        onFinish={finish}
      />
    );
  }
  return (
    <LiveView
      modality={modality}
      session={session}
      reading={reading}
      intensity={intensity}
      onLeave={router.back}
      onPause={() => {
        dispatch({ type: 'pause', now: Date.now() });
        void tracking.pausar();
      }}
      onResume={() => {
        dispatch({ type: 'resume', now: Date.now() });
        void tracking.iniciar();
      }}
      onLap={() =>
        dispatch({
          type: 'lap',
          now: Date.now(),
          distanceMeters: modality.usesGps ? tracking.distanceMeters : null,
        })
      }
      onFinish={finish}
      onOpenRoute={() => dispatch({ type: 'openRoute' })}
    />
  );
}

function SummaryMoment(props: CardioMomentProps & { modality: CardioModality }) {
  const { modality, session, reading, recording } = props;
  const router = useRouter();
  const profile = useHeartRateProfile(props.studentId);
  const [sharing, setSharing] = useState(false);

  return (
    <>
      <SummaryView
        modality={modality}
        reading={reading}
        startedAt={session.startedAt ?? 0}
        goalMinutes={session.goalMinutes}
        goalReached={session.goalReachedAt !== null}
        vitals={recording.vitals}
        declaresMedication={profile?.declaresMedication ?? false}
        onBack={router.back}
        onHistory={() => router.push(ROUTES.STUDENT.SESSION_HISTORY)}
        onShare={() => setSharing(true)}
      />
      <ShareWorkoutModal
        visible={sharing}
        onClose={() => setSharing(false)}
        stats={{
          title: 'Cardio finalizado',
          duration: formatarDuracao(reading.elapsedMs / 1000),
          calories: `${Math.round(reading.calories)} kcal`,
          date: dataCurtaDoInstante(new Date(session.startedAt ?? 0).toISOString()),
          exerciseName: modality.activityName,
        }}
      />
    </>
  );
}

/** "30:12 · 268 kcal · 11,8 km", sem a distância quando não houve percurso. */
function summaryLine(modality: CardioModality, reading: CardioReading): string {
  const parts = [formatarDuracao(reading.elapsedMs / 1000), `${Math.round(reading.calories)} kcal`];
  if (modality.usesGps && reading.distanceMeters > 0) {
    parts.push(`${formatKilometers(reading.distanceMeters)} km`);
  }
  return parts.join(' · ');
}
