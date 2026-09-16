import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { type CaptureCheck, captureChecks } from '../services/captureProgress';
import type { Vista } from '../services/portao';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * Tela 3 do kit de body scan: as três poses, o que já foi feito e o que a
 * captura conferiu sozinha (#316).
 *
 * O quadro mostra o corpo de referência, e não a foto: a foto só existe para a
 * análise, e a tela não precisa exibi-la para dizer que a pose está feita.
 *
 * @example <BodyScanGrid />
 */

// Três fotos, não quatro. As duas laterais davam a mesma informação para a
// análise e dobravam o incômodo de se fotografar — o que faz o aluno desistir
// no meio. O lado direito é instrução, para as análises saírem comparáveis; o
// portão não confere o lado.
const POSES: { id: Vista; label: string; hint: string }[] = [
  { id: 'front', label: 'Frente', hint: 'Braços levemente afastados' },
  { id: 'back', label: 'Costas', hint: 'De costas, mesma distância' },
  { id: 'side', label: 'Perfil', hint: 'Lado direito, braços soltos' },
];

export default function BodyScanGrid() {
  const router = useRouter();
  const { capturedImages, studentId, captureFraming, qualidade, discardCapture } =
    useAssessmentStore();
  const done = POSES.filter((pose) => capturedImages[pose.id]).length;
  const allDone = done === POSES.length;
  useStudentGuard();
  useDiscardOnLeave();

  const analyze = () =>
    router.push({ pathname: ROUTES.ASSESSMENT.PROCESSING, params: { studentId } });

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{ rotulo: 'Refazer', icone: 'refresh', onPress: discardCapture }}
          principal={{
            rotulo: `Analisar ${POSES.length} fotos`,
            icone: 'sparkles-outline',
            onPress: analyze,
            desabilitada: !allDone,
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        <Text
          accessibilityRole="header"
          className="flex-1 text-center text-[0.96875rem] font-bold text-hero"
        >
          Captura de fotos
        </Text>
        <View className="w-[2.375rem]" />
      </View>

      <View className="mt-4 flex-row items-center gap-2.5">
        <View className="flex-1">
          <BarraDeProgresso percentual={(done / POSES.length) * 100} />
        </View>
        <Text className="text-[0.71875rem] font-extrabold text-primary-text">
          {done} / {POSES.length}
        </Text>
      </View>

      <Text className="mt-3.5 text-center text-[0.78125rem] text-hero-secondary">
        Toque em um quadro para capturar o ângulo.
      </Text>

      <View className="mt-3.5 flex-row gap-2.5">
        {POSES.map((pose) => (
          <PoseCard
            key={pose.id}
            pose={pose}
            done={Boolean(capturedImages[pose.id])}
            onPress={() =>
              router.push({ pathname: ROUTES.ASSESSMENT.CAMERA, params: { target: pose.id } })
            }
          />
        ))}
      </View>

      <Checks
        checks={captureChecks({ photos: done, framing: captureFraming, quality: qualidade })}
      />
    </GlassScreen>
  );
}

/** Sem aluno identificado a análise não tem dono: volta antes da primeira foto. */
function useStudentGuard() {
  const router = useRouter();
  const studentId = useAssessmentStore((s) => s.studentId);
  const { studentId: param } = useLocalSearchParams<{ studentId?: string }>();

  useEffect(() => {
    if (studentId) return;
    if (param) {
      useAssessmentStore.getState().setStudentId(param);
      return;
    }
    showAlert({
      title: 'Não identifiquei a conta',
      message: 'Volte e comece o scan de novo.',
      type: 'error',
      buttonText: 'Voltar',
      onDismiss: () => router.back(),
    });
  }, [studentId, param, router]);
}

/**
 * Sair da grade sem analisar apaga as fotos (#316 §3). Abrir a câmera ou o
 * processamento empilha por cima e não remove a grade, então não dispara.
 */
function useDiscardOnLeave() {
  const navigation = useNavigation();
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        void useAssessmentStore.getState().discardCapture();
      }),
    [navigation]
  );
}

const CHECK_SIZE = 12;

function PoseCard({
  pose,
  done,
  onPress,
}: {
  pose: (typeof POSES)[number];
  done: boolean;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      className="flex-1"
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${pose.label}: ${done ? 'feita, toque para refazer' : 'toque para fotografar'}`}
    >
      <Vidro className={cn('p-2', done ? 'border-primary' : null)}>
        <View
          className={cn(
            'h-[9.375rem] items-center justify-center overflow-hidden rounded-[0.875rem]',
            done ? 'bg-glass-strong' : 'border border-dashed border-glass-border'
          )}
        >
          <ReferenceBody
            pose={pose.id}
            height={148}
            tone={done ? 'brand' : 'muted'}
            glow={done}
            opacity={done ? 1 : 0.5}
          />
          {done ? (
            <View className="absolute right-[0.4375rem] top-[0.4375rem] h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Ionicons
                name="checkmark"
                size={escalar(CHECK_SIZE)}
                color={cores.primaryForeground}
              />
            </View>
          ) : null}
        </View>
        <Text className="mt-[0.5625rem] text-center text-[0.75rem] font-bold text-foreground">
          {pose.label}
        </Text>
        <Text className="mt-0.5 text-center text-[0.59375rem] leading-[0.78rem] text-placeholder">
          {pose.hint}
        </Text>
      </Vidro>
    </TouchableOpacity>
  );
}

const CHECK_ICON: Record<CaptureCheck['key'], keyof typeof Ionicons.glyphMap> = {
  level: 'move-outline',
  framing: 'scan-outline',
  light: 'sunny-outline',
};

function Checks({ checks }: { checks: CaptureCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <>
      <TituloDeSecao estilo="rotulo">Checagem automática</TituloDeSecao>
      <View className="gap-[0.5625rem]">
        {checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </View>
    </>
  );
}

const ROW_ICON = 15;

function CheckRow({ check }: { check: CaptureCheck }) {
  const cores = useCores();
  const escalar = useEscala();
  const ok = check.tone === 'ok';
  const tint = ok ? cores.textoPassos : cores.textoGordura;
  return (
    <Vidro className="flex-row items-center gap-3 p-3">
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-[0.625rem]',
          ok ? 'bg-metrica-passos/15' : 'bg-metrica-gordura/15'
        )}
      >
        <Ionicons name={CHECK_ICON[check.key]} size={escalar(ROW_ICON)} color={tint} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[0.84375rem] font-semibold text-foreground">{check.title}</Text>
        <Text className="mt-px text-[0.71875rem] text-muted-foreground">{check.detail}</Text>
      </View>
      {ok ? (
        <Ionicons name="checkmark-circle-outline" size={escalar(17)} color={tint} />
      ) : (
        <Text className="text-[0.65625rem] font-extrabold uppercase tracking-wide text-texto-macro-gordura">
          Atenção
        </Text>
      )}
    </Vidro>
  );
}
