import type { PersonaTrack, UnlockCard } from '@elevapro/shared/data/anamnesisAdaptive';
import {
  getPrecisionScore,
  getQuestionPrecisionDelta,
  getTrackQuestions,
  PERSONA_OPTIONS,
  UNLOCK_CARDS,
} from '@elevapro/shared/data/anamnesisAdaptive';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { type Cores, useCores } from '@/shared/design';
import { AdaptiveQuestionField, type AnamnesisValue } from '../components/AdaptiveQuestionField';
import { AnamnesisService } from '../services/anamnesisService';

// ─── Icon maps ────────────────────────────────────────────────────────────────

const TRACK_ICONS: Record<PersonaTrack, keyof typeof Ionicons.glyphMap> = {
  beginner: 'leaf-outline',
  returning: 'refresh-outline',
  intermediate: 'barbell-outline',
  advanced: 'trophy-outline',
};

const UNLOCK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  height: 'flame-outline',
  gym_type: 'barbell-outline',
  injuries: 'shield-outline',
  commitment: 'flash-outline',
};

/** A cor da precisão do perfil: sucesso a partir de 80, aviso a partir de 60. */
function precisionColor(cores: Cores, precision: number, below: string): string {
  if (precision >= 80) return cores.metricaPassos;
  return precision >= 60 ? cores.metricaGordura : below;
}

// ─── Persona Screen ───────────────────────────────────────────────────────────

function PersonaScreen({ onSelect }: { onSelect: (t: PersonaTrack) => void }) {
  const cores = useCores();
  return (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      <View className="pt-6 pb-4">
        <Text className="text-xs text-zinc-600 font-medium uppercase tracking-widest mb-2">
          Passo inicial
        </Text>
        <Text className="text-2xl font-black text-white leading-tight">
          Como você se descreveria?
        </Text>
        <Text className="text-sm text-zinc-500 mt-1.5">
          Vamos montar seu plano a partir do seu nível real.
        </Text>
      </View>
      <View className="gap-2.5 pb-8">
        {PERSONA_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.track}
            onPress={() => onSelect(opt.track)}
            className="flex-row items-center gap-4 p-4 rounded-2xl border border-white/10 bg-zinc-900/50"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-zinc-800 items-center justify-center">
              <Ionicons name={TRACK_ICONS[opt.track]} size={20} color={cores.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">{opt.label}</Text>
              <Text className="text-zinc-500 text-xs mt-0.5">{opt.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={cores.placeholder} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Unlock Screen ────────────────────────────────────────────────────────────

function UnlockScreen({ card, onContinue }: { card: UnlockCard; onContinue: () => void }) {
  const iconName = (UNLOCK_ICONS[card.afterQuestionId] ??
    'flash-outline') as keyof typeof Ionicons.glyphMap;
  return (
    <View className="flex-1 items-center justify-center px-8 gap-6">
      <View className="relative">
        <View className="w-20 h-20 rounded-2xl bg-zinc-800 border border-white/10 items-center justify-center">
          <Ionicons name={iconName} size={36} color="white" />
        </View>
        <View className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
          <Ionicons name="checkmark" size={14} color="white" />
        </View>
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-black text-white uppercase tracking-tight text-center">
          {card.title}
        </Text>
        <Text className="text-sm text-zinc-400 text-center leading-relaxed">{card.detail}</Text>
      </View>
      <TouchableOpacity
        onPress={onContinue}
        className="w-full py-3 bg-white rounded-xl items-center flex-row justify-center gap-2"
        activeOpacity={0.8}
      >
        <Text className="text-black font-bold text-sm">Continuar</Text>
        <Ionicons name="arrow-forward" size={16} color="black" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({
  score,
  startedMeasures,
  onStartCoach,
  onRetake,
}: {
  score: number;
  /** A anamnese gravou a primeira medida declarada, e a tela diz onde achá-la. */
  startedMeasures: boolean;
  onStartCoach: () => void;
  onRetake: () => void;
}) {
  const cores = useCores();
  const label = score >= 80 ? 'Perfil completo' : score >= 60 ? 'Bom começo' : 'Dados iniciais';
  const scoreColor = precisionColor(cores, score, cores.mutedForeground);

  return (
    <View className="flex-1 items-center justify-center px-8 gap-6">
      <View
        className="w-28 h-28 rounded-full border-2 items-center justify-center"
        style={{ borderColor: scoreColor }}
      >
        <Text className="text-2xl font-black" style={{ color: scoreColor }}>
          {score}%
        </Text>
        <Text className="text-[0.625rem] text-zinc-600 uppercase tracking-wide font-medium">
          precisão
        </Text>
      </View>
      <View className="items-center gap-2">
        <Text className="text-xl font-black text-white uppercase tracking-tight">{label}</Text>
        <Text className="text-sm text-zinc-400 text-center leading-relaxed max-w-xs">
          {score >= 80
            ? 'Seu coach tem tudo que precisa para montar um plano personalizado.'
            : score >= 60
              ? 'Dados suficientes para começar. O coach pode pedir mais detalhes.'
              : 'Você pode continuar e responder mais no chat com o coach.'}
        </Text>
      </View>
      {startedMeasures ? (
        <Text className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
          Suas medidas viraram o primeiro registro em Progresso → Composição corporal, e você pode
          corrigir ou apagar quando quiser.
        </Text>
      ) : null}
      <View className="w-full gap-2.5">
        <TouchableOpacity
          onPress={onStartCoach}
          className="w-full py-3 bg-white rounded-xl flex-row items-center justify-center gap-2"
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={16} color="black" />
          <Text className="text-black font-bold text-sm">Gerar meu plano agora</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRetake}
          className="w-full py-2.5 items-center"
          activeOpacity={0.7}
        >
          <Text className="text-zinc-500 text-xs font-medium">Refazer anamnese</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
  const cores = useCores();
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
  const progressPct = questions.length > 0 ? Math.round(((step + 1) / questions.length) * 100) : 0;
  const barColor = precisionColor(cores, precision, cores.metricaSono);

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
      <SafeAreaView className="flex-1 bg-black">
        <CompletionScreen
          score={precision}
          startedMeasures={startedMeasures}
          onStartCoach={() => router.replace('/(tabs)')}
          onRetake={handleRetake}
        />
      </SafeAreaView>
    );

  if (!track)
    return (
      <SafeAreaView className="flex-1 bg-black">
        <PersonaScreen onSelect={handleSelectTrack} />
      </SafeAreaView>
    );

  if (pendingUnlock)
    return (
      <SafeAreaView className="flex-1 bg-black">
        <UnlockScreen
          card={pendingUnlock}
          onContinue={() => {
            setPendingUnlock(null);
            setStep((s) => s + 1);
            setShowWhy(false);
          }}
        />
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-4 pb-8 gap-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name={TRACK_ICONS[track]} size={14} color={cores.mutedForeground} />
                <Text className="text-xs text-zinc-500 font-medium capitalize">{track}</Text>
              </View>
              <Text className="text-xs text-zinc-500 tabular-nums">
                {step + 1} / {questions.length}
              </Text>
            </View>
            <View className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <View className="h-full bg-white rounded-full" style={{ width: `${progressPct}%` }} />
            </View>
          </View>

          {/* Question card */}
          <View className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 gap-5">
            <View>
              <Text className="text-[0.625rem] text-zinc-600 uppercase tracking-wider font-medium mb-2">
                Pergunta {step + 1}
              </Text>
              <Text className="text-xl font-black text-white leading-snug">{currentQ.text}</Text>
            </View>

            <AdaptiveQuestionField
              question={currentQ}
              value={responses[currentQ.id]}
              onChange={handleChange}
            />

            <TouchableOpacity
              onPress={() => setShowWhy((v) => !v)}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}
            >
              <Text className="text-xs text-zinc-600">Por que perguntamos?</Text>
              <Ionicons
                name={showWhy ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={cores.placeholder}
              />
            </TouchableOpacity>
            {showWhy && (
              <View className="border-l border-white/10 pl-3 -mt-3">
                <Text className="text-xs text-zinc-500 leading-relaxed">{currentQ.whyWeAsk}</Text>
              </View>
            )}
          </View>

          {/* Precision meter */}
          <View className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-zinc-500 font-medium">Precisão do plano</Text>
              <Text className="text-sm font-black text-white">{precision}%</Text>
            </View>
            <View className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{ width: `${precision}%`, backgroundColor: barColor }}
              />
            </View>
            <Text className="text-[0.625rem] text-zinc-600">Plano genérico: 30% · Meta: 94%</Text>
          </View>

          {/* Navigation */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleBack}
              className="px-5 py-3 bg-zinc-900 rounded-xl border border-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-zinc-400 font-semibold text-sm">
                {step === 0 ? 'Voltar' : 'Anterior'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              disabled={saving}
              className="flex-1 py-3 bg-white rounded-xl flex-row items-center justify-center gap-2"
              style={{ opacity: saving ? 0.4 : 1 }}
              activeOpacity={0.8}
            >
              {isLastStep ? (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="black" />
                  <Text className="text-black font-bold text-sm">
                    {saving ? 'Salvando...' : 'Concluir'}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-black font-bold text-sm">
                    {saving ? 'Salvando...' : 'Próximo'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="black" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
