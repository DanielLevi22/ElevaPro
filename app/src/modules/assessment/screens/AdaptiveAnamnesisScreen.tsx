import type { PersonaTrack, UnlockCard } from '@elevapro/shared/data/anamnesisAdaptive';
import {
  getPrecisionScore,
  getQuestionPrecisionDelta,
  getTrackQuestions,
  UNLOCK_CARDS,
} from '@elevapro/shared/data/anamnesisAdaptive';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { StepBar } from '@/components/ui/StepBar';
import { Vidro } from '@/components/ui/Vidro';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { useCores, useEscala } from '@/shared/design';
import {
  CompletionStep,
  PersonaStep,
  precisionTone,
  TRACK_ICONS,
  trackLabel,
  UnlockStep,
} from '../components/AdaptiveAnamnesisSteps';
import { AdaptiveQuestionField, type AnamnesisValue } from '../components/AdaptiveQuestionField';
import { AnamnesisService } from '../services/anamnesisService';

/**
 * A anamnese adaptativa do Praticante, no kit de vidro (#361): o nível de
 * partida, uma pergunta por vez com a precisão do plano subindo, os desbloqueios
 * entre blocos e a conclusão.
 *
 * @example <AdaptiveAnamnesisScreen />
 */

/** Pergunta ainda sem resposta: vazio, nulo ou lista sem item. */
function semResposta(value: AnamnesisValue | undefined): boolean {
  return (
    value === undefined ||
    value === '' ||
    value === null ||
    (Array.isArray(value) && value.length === 0)
  );
}

export default function AdaptiveAnamnesisScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const studentId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forceRetake, setForceRetake] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  // O aluno precisa saber que a anamnese registrou uma medida de saúde por ele
  // (Art. 6°, VI): a tela final diz, e aponta onde ela vive.
  const [startedMeasures, setStartedMeasures] = useState(false);
  const [track, setTrack] = useState<PersonaTrack | null>(null);
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, AnamnesisValue>>({});
  const [pendingUnlock, setPendingUnlock] = useState<UnlockCard | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      AnamnesisService.getAnamnesis(studentId),
      AnamnesisService.getPersonaTrack(studentId),
    ]).then(([anamnesis, savedTrack]) => {
      if (anamnesis?.completedAt && !forceRetake) {
        setIsCompleted(true);
      }

      if (anamnesis?.responses) {
        const raw = anamnesis.responses as Record<string, unknown>;
        const normalized: Record<string, AnamnesisValue> = Object.fromEntries(
          Object.entries(raw).map(([k, v]) => {
            if (v !== null && typeof v === 'object' && !Array.isArray(v) && 'value' in v) {
              return [k, (v as { value: AnamnesisValue }).value];
            }
            return [k, v as AnamnesisValue];
          })
        );
        setResponses(normalized);

        if (savedTrack && !anamnesis.completedAt) {
          const t = savedTrack as PersonaTrack;
          // A retomada procura entre as perguntas guardadas: a medida não fica em
          // `responses` (vira Assessment), e voltaria a parecer sem resposta sempre.
          const pending = getTrackQuestions(t).find((q) => semResposta(normalized[q.id]));
          const index = pending
            ? getTrackQuestions(t, { withMeasurements: true }).findIndex((q) => q.id === pending.id)
            : -1;
          setTrack(t);
          if (index > 0) setStep(index);
        }
      } else if (savedTrack) {
        setTrack(savedTrack as PersonaTrack);
      }

      setLoading(false);
    });
  }, [studentId, forceRetake]);

  const isDone = isCompleted || sessionDone;
  // A tela é só do Praticante (a rota escolhe pelo papel), e é a ele que as medidas
  // de partida servem: com especialista, quem mede é ele (#312).
  const questions = track ? getTrackQuestions(track, { withMeasurements: true }) : [];
  const currentQ = questions[step];
  // A precisão conta só o que fica guardado: a medida de partida sai de `responses`
  // ao salvar, e contá-la faria o selo cair sozinho na volta (#312).
  const scored = track ? getTrackQuestions(track) : [];
  const precision = scored.length > 0 ? getPrecisionScore(scored, responses) : 30;
  const isLastStep = step === questions.length - 1;

  const handleSelectTrack = async (t: PersonaTrack) => {
    setTrack(t);
    setStep(0);
    setShowWhy(false);
    if (studentId) {
      await AnamnesisService.savePersonaTrack(studentId, t);
    }
  };

  const handleNext = async () => {
    if (!studentId || !track || saving) return;
    setSaving(true);
    const saved = await AnamnesisService.saveAdaptiveAnamnesis(studentId, responses, isLastStep);
    setSaving(false);
    if (saved.startingMeasure === 'created') setStartedMeasures(true);

    const unlock = UNLOCK_CARDS.find((u) => u.afterQuestionId === currentQ.id);
    if (unlock && !isLastStep) {
      setPendingUnlock(unlock);
      return;
    }
    if (isLastStep) {
      setSessionDone(true);
    } else {
      setStep((s) => s + 1);
      setShowWhy(false);
    }
  };

  const handleChange = (value: AnamnesisValue) => {
    setResponses((prev) => ({ ...prev, [currentQ.id]: value }));
    getQuestionPrecisionDelta(currentQ, questions); // side-effect: keep import alive
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      setShowWhy(false);
    } else {
      setTrack(null);
    }
  };

  const handleRetake = () => {
    setForceRetake(true);
    setIsCompleted(false);
    setSessionDone(false);
    setTrack(null);
    setStep(0);
    setResponses({});
    setLoading(true);
  };

  if (loading) return null;

  if (isDone)
    return (
      <GlassScreen glow={HEALTH_GLOW}>
        <CompletionStep
          score={precision}
          startedMeasures={startedMeasures}
          onStartCoach={() => router.replace('/(tabs)')}
          onRetake={handleRetake}
        />
      </GlassScreen>
    );

  if (!track)
    return (
      <GlassScreen glow={HEALTH_GLOW}>
        <View className="mb-4 pt-1.5">
          <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        </View>
        <PersonaStep onSelect={handleSelectTrack} />
      </GlassScreen>
    );

  if (pendingUnlock)
    return (
      <GlassScreen glow={HEALTH_GLOW}>
        <UnlockStep
          card={pendingUnlock}
          onContinue={() => {
            setPendingUnlock(null);
            setStep((s) => s + 1);
            setShowWhy(false);
          }}
        />
      </GlassScreen>
    );

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{
            rotulo: step === 0 ? 'Voltar' : 'Anterior',
            icone: 'arrow-back',
            onPress: handleBack,
          }}
          principal={{
            rotulo: saving ? 'Salvando…' : isLastStep ? 'Concluir' : 'Próximo',
            icone: isLastStep ? 'checkmark' : 'arrow-forward',
            onPress: handleNext,
            desabilitada: saving,
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Fechar a anamnese" onPress={router.back} />
        <View className="flex-1">
          <StepBar current={step + 1} total={questions.length} />
        </View>
      </View>

      <View className="mb-3 mt-5 flex-row">
        <Chip icone={TRACK_ICONS[track]}>{trackLabel(track)}</Chip>
      </View>

      <Vidro className="gap-4 p-[0.9375rem]">
        <View>
          <Text className="text-micro font-bold uppercase tracking-wide text-muted-foreground">
            Pergunta {step + 1}
          </Text>
          <Text className="mt-1 text-[1.1875rem] font-bold leading-snug tracking-tight text-foreground">
            {currentQ.text}
          </Text>
        </View>

        <AdaptiveQuestionField
          question={currentQ}
          value={responses[currentQ.id]}
          onChange={handleChange}
        />

        <PorQuePerguntamos aberto={showWhy} onToggle={() => setShowWhy((v) => !v)}>
          {currentQ.whyWeAsk}
        </PorQuePerguntamos>
      </Vidro>

      <Vidro classeExterna="mt-3" className="gap-2 p-[0.9375rem]">
        <View className="flex-row items-center justify-between">
          <Text className="text-micro font-bold uppercase tracking-wide text-muted-foreground">
            Precisão do plano
          </Text>
          <Text className="text-[0.9375rem] font-bold text-foreground">{precision}%</Text>
        </View>
        <BarraDeProgresso percentual={precision} tom={precisionTone(precision)} />
        <Text className="text-micro text-muted-foreground">Plano genérico: 30% · Meta: 94%</Text>
      </Vidro>
    </GlassScreen>
  );
}

const ICONE_DO_PORQUE = 12;

function PorQuePerguntamos({
  aberto,
  onToggle,
  children,
}: {
  aberto: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        className="flex-row items-center gap-1"
      >
        <Text className="text-micro font-semibold text-muted-foreground">Por que perguntamos?</Text>
        <Ionicons
          name={aberto ? 'chevron-up' : 'chevron-down'}
          size={escalar(ICONE_DO_PORQUE)}
          color={cores.placeholder}
        />
      </TouchableOpacity>
      {aberto ? (
        <Text className="mt-2 border-l border-glass-border pl-3 text-micro leading-relaxed text-muted-foreground">
          {children}
        </Text>
      ) : null}
    </View>
  );
}
