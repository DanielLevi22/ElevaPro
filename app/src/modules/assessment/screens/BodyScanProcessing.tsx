import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { ROUTES } from '@/navigation/types';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { analysisSteps, type StepState } from '../services/captureProgress';
import { grantScanConsent } from '../services/scanConsent';
import { useAssessmentStore } from '../store/assessmentStore';
import { AssessmentStatus } from '../types/assessment';

/**
 * Tela 5 do kit de body scan: a análise em andamento, e o que fazer quando ela
 * falha ou pede autorização (#316).
 *
 * @example <BodyScanProcessing />
 */
export default function BodyScanProcessing() {
  const router = useRouter();
  const { submitScan, status, errorMessage, etapaDaAnalise, lastScanId } = useAssessmentStore();
  const openResult = useOpenResult();
  const opened = useRef<string | null>(null);
  useSubmitOnce();

  // Chegando o id, a tela sai sozinha, uma vez. O botão fica para quando a
  // navegação falhar: uma tela que só sai por navegação fica presa quando ela
  // falha — foi assim que uma análise de 14 s deixou o aluno no "Analisando...".
  useEffect(() => {
    if (status !== AssessmentStatus.COMPLETED || !lastScanId) return;
    if (opened.current === lastScanId) return;
    opened.current = lastScanId;
    openResult(lastScanId);
  }, [status, lastScanId, openResult]);

  if (status === AssessmentStatus.COMPLETED && lastScanId) {
    return (
      <Outcome
        title="Análise pronta"
        action={{
          label: 'Ver resultado',
          icon: 'eye-outline',
          onPress: () => openResult(lastScanId),
        }}
        onBack={router.back}
      >
        <Paragraph>Suas medidas foram calculadas e as fotos, apagadas do celular.</Paragraph>
      </Outcome>
    );
  }

  if (status === AssessmentStatus.ERROR) {
    return (
      <Outcome
        title="A análise não completou"
        action={{ label: 'Tentar de novo', icon: 'refresh', onPress: submitScan }}
        onBack={router.back}
      >
        <FailureMessage text={errorMessage} />
      </Outcome>
    );
  }

  if (status === AssessmentStatus.NEEDS_CONSENT) return <ConsentOutcome />;

  return (
    <GlassScreen glow={HEALTH_GLOW} bottomSpace="tab">
      <View className="flex-row justify-end pt-1.5">
        {/* Volta para a grade com as fotos: fechar não é desistir do scan. */}
        <BotaoRedondo icone="x" rotulo="Fechar" onPress={router.back} />
      </View>
      <View className="mt-6 items-center">
        <ScanningBody />
        <Text
          accessibilityRole="header"
          className="mt-[1.625rem] font-display-black text-[1.4375rem] tracking-tight text-hero"
        >
          Analisando suas fotos
        </Text>
        <Text className="mt-[0.4375rem] max-w-[16.875rem] text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
          Costuma levar cerca de meio minuto. Não feche o app — as fotos não são guardadas depois da
          análise.
        </Text>
      </View>
      <Vidro classeExterna="mt-[1.375rem]" className="gap-[0.6875rem] p-[0.9375rem]">
        {analysisSteps(etapaDaAnalise).map((step) => (
          <StepRow key={step.label} label={step.label} state={step.state} />
        ))}
      </Vidro>
    </GlassScreen>
  );
}

/**
 * Manda as fotos uma vez, ao abrir. O efeito não depende das fotos: no sucesso
 * elas são zeradas, e um efeito que as lesse rodaria de novo e mandaria o aluno
 * de volta à introdução por "não haver fotos".
 */
function useSubmitOnce() {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { capturedImages, submitScan } = useAssessmentStore.getState();
    if (Object.keys(capturedImages).length === 0) {
      router.back();
      return;
    }
    void submitScan();
  }, [router]);
}

/**
 * Fecha o fluxo do scan e abre a leitura dentro de Progresso, onde o histórico
 * mora. Fechar antes de abrir tira a grade e o preparo da pilha: voltar da
 * leitura não pode cair numa captura que já acabou.
 */
function useOpenResult() {
  const router = useRouter();
  return (scanId: string) => {
    if (router.canDismiss()) router.dismissAll();
    router.push(ROUTES.PROGRESS.SCAN(scanId));
  };
}

const BODY_HEIGHT = 250;

/** O corpo com o anel tracejado, a luz e a linha de varredura do kit. */
function ScanningBody() {
  const brilho = useBrilho();
  return (
    <View className="items-center justify-center">
      <View className="absolute h-[13.25rem] w-[13.25rem] rounded-full border border-dashed border-primary/45" />
      <View className="absolute h-[10.25rem] w-[10.25rem] rounded-full bg-primary/10" />
      <ReferenceBody height={BODY_HEIGHT} />
      <View
        className="absolute left-[14%] right-[14%] top-[42%] h-[0.15625rem] rounded-full bg-primary"
        style={{ boxShadow: brilho({ blur: 22 }) }}
      />
    </View>
  );
}

const STEP_ICON = 12;

function StepRow({ label, state }: { label: string; state: StepState }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="flex-row items-center gap-[0.6875rem]">
      <View
        className={cn(
          'h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full',
          state === 'done' ? 'bg-primary' : null,
          state === 'doing' ? 'border-[0.09375rem] border-primary bg-primary/20' : null,
          state === 'pending' ? 'bg-glass-strong' : null
        )}
      >
        {state === 'done' ? (
          <Ionicons name="checkmark" size={escalar(STEP_ICON)} color={cores.primaryForeground} />
        ) : null}
        {state === 'doing' ? <ActivityIndicator size="small" color={cores.primaryText} /> : null}
      </View>
      <Text
        className={cn(
          'flex-1 text-[0.78125rem]',
          state === 'pending' ? 'text-placeholder' : 'text-foreground',
          state === 'doing' ? 'font-bold' : 'font-medium'
        )}
      >
        {label}
      </Text>
    </View>
  );
}

interface OutcomeProps {
  title: string;
  action: {
    label: string;
    icon: 'eye-outline' | 'refresh' | 'shield-checkmark-outline';
    onPress: () => void;
    busy?: boolean;
  };
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
}

/** O fim da espera que não é a análise em andamento: pronta, falha ou autorização. */
function Outcome({ title, action, onBack, backLabel = 'Voltar', children }: OutcomeProps) {
  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{ rotulo: backLabel, icone: 'chevron-back', onPress: onBack }}
          principal={{
            rotulo: action.label,
            icone: action.icon,
            onPress: action.onPress,
            desabilitada: action.busy,
          }}
        />
      }
    >
      <View className="mt-10 items-center">
        <ReferenceBody height={180} />
        <Text
          accessibilityRole="header"
          className="mt-6 text-center font-display-black text-[1.4375rem] tracking-tight text-hero"
        >
          {title}
        </Text>
      </View>
      {children}
    </GlassScreen>
  );
}

function Paragraph({ children }: { children: string }) {
  return (
    <Text className="mt-3 text-center text-[0.875rem] leading-[1.35rem] text-hero-secondary">
      {children}
    </Text>
  );
}

/**
 * A frase do aluno e o diagnóstico de quem conserta, com pesos diferentes.
 *
 * `mensagemDeErroBff` devolve as duas no mesmo texto, separadas por linha em
 * branco. Com o mesmo estilo, o aluno lia "java.io.IOException" como instrução
 * do que fazer. O bloco `[dev]` só existe em desenvolvimento.
 */
function FailureMessage({ text }: { text: string | null }) {
  const [message, ...diagnosis] = (
    text ?? 'Não consegui completar a análise. Tente de novo.'
  ).split('\n\n');
  return (
    <>
      <Paragraph>{message}</Paragraph>
      {diagnosis.length > 0 ? (
        <Vidro classeExterna="mt-4" className="p-3.5">
          <Text className="text-xs leading-5 text-muted-foreground">{diagnosis.join('\n\n')}</Text>
        </Vidro>
      ) : null}
      {/* As fotos continuam no aparelho até a análise sair: repetir a captura
          depois de esperar é o que fazia o aluno desistir. */}
      <Paragraph>Suas fotos foram mantidas — não precisa tirar de novo.</Paragraph>
    </>
  );
}

function ConsentOutcome() {
  const router = useRouter();
  const submitScan = useAssessmentStore((s) => s.submitScan);
  const [granting, setGranting] = useState(false);

  const grant = async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;
    setGranting(true);
    try {
      if (!(await grantScanConsent(userId))) return;
      await submitScan();
    } finally {
      setGranting(false);
    }
  };

  return (
    <Outcome
      title="Falta a sua autorização"
      action={{
        label: 'Autorizar e analisar',
        icon: 'shield-checkmark-outline',
        onPress: grant,
        busy: granting,
      }}
      onBack={router.back}
      backLabel="Agora não"
    >
      <Paragraph>
        Para analisar suas fotos, precisamos da sua autorização para tratar dados de saúde. As
        imagens vão para um serviço de inteligência artificial externo e não são guardadas — só o
        resultado fica salvo.
      </Paragraph>
      <Paragraph>Você pode revogar essa autorização quando quiser, no seu perfil.</Paragraph>
    </Outcome>
  );
}
