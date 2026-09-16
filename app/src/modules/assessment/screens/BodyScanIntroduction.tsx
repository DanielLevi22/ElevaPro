import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Bullet } from '@/components/ui/Bullet';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { ROUTES } from '@/navigation/types';
import { HowItWorksSheet } from '../components/HowItWorksSheet';
import { IntroIllustration } from '../components/IntroIllustration';
import {
  type AvisoDoPortao,
  avisoDoPortao,
  consultarElegibilidade,
  type Elegibilidade,
} from '../services/elegibilidade';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * Tela 1 do kit de body scan: o que é o scan, para onde vão as fotos e a porta
 * para o preparo (#316).
 *
 * @example <BodyScanIntroduction />
 */
export default function BodyScanIntroduction() {
  const router = useRouter();
  const [howItWorks, setHowItWorks] = useState(false);
  const { gate, grantConsent } = useEligibility();
  const start = useStartScan();

  const onPrimary = async () => {
    setHowItWorks(false);
    // O portão vem antes da câmera: o aluno descobre que falta algo antes de
    // gastar a captura, e não numa mensagem de erro no fim.
    if (!gate) return start();
    if (gate.destino) return router.push(gate.destino);
    if (await grantConsent()) start();
  };

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{
            rotulo: 'Como funciona',
            icone: 'information-circle-outline',
            onPress: () => setHowItWorks(true),
          }}
          principal={{
            rotulo: gate ? gate.rotulo : 'Começar scan',
            icone: 'scan-outline',
            onPress: onPrimary,
          }}
        />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        <BotaoRedondo
          icone="history"
          rotulo="Histórico de scans"
          onPress={() => router.push(ROUTES.PROGRESS.SCANS)}
        />
      </View>

      <View className="mt-3.5 items-center">
        <Chip tom="ia">Tecnologia IA</Chip>
        <Text
          accessibilityRole="header"
          className="mt-3 text-center font-display-black text-[1.8125rem] leading-[2rem] tracking-tight text-hero"
        >
          Escaneamento <Text className="text-primary-text">corporal</Text>
        </Text>
        {/* Dizia "método extremamente preciso". Sobre estimativa de IA isso é
            informação enganosa, e o Art. 6°, VI exige transparência. */}
        <Text className="mt-[0.5625rem] text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
          Três fotos viram uma estimativa de proporção, simetria e postura, para acompanhar sua
          evolução entre as avaliações. Não substitui a fita métrica.
        </Text>
      </View>

      <IntroIllustration />

      <Vidro className="p-[0.9375rem]">
        <Bullet>
          <Bullet.Strong>Suas fotos saem do aparelho.</Bullet.Strong> Elas são enviadas a um serviço
          de inteligência artificial externo (Anthropic, nos Estados Unidos) só para gerar a
          análise.
        </Bullet>
        <Bullet>
          <Bullet.Strong>Nenhuma foto é guardada.</Bullet.Strong> O que fica salvo é o resultado —
          as medidas estimadas e as notas de postura.
        </Bullet>
      </Vidro>

      {gate ? <GateNotice gate={gate} /> : null}

      <HowItWorksSheet
        visible={howItWorks}
        onClose={() => setHowItWorks(false)}
        onStart={onPrimary}
      />
    </GlassScreen>
  );
}

/**
 * O que falta para escanear, perguntado na entrada.
 *
 * `null` é "pode escanear" e também "consulta em voo": o `start` não espera por
 * ela, e a análise tem a própria guarda.
 */
function useEligibility() {
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const [eligibility, setEligibility] = useState<Elegibilidade | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    consultarElegibilidade(token)
      .then((result) => alive && setEligibility(result))
      // Falha de rede não fecha o portão: barrar o aluno porque a checagem caiu
      // seria trocar um beco por outro.
      .catch(() => alive && setEligibility({ podeEscanear: true }));
    return () => {
      alive = false;
    };
  }, [token]);

  const gate: AvisoDoPortao | null =
    eligibility && !eligibility.podeEscanear && eligibility.motivo
      ? avisoDoPortao(eligibility.motivo)
      : null;

  /**
   * O aviso de consentimento se resolve aqui: o botão dizia "Autorizar" e não
   * fazia nada, porque a tela saía antes de começar e o aviso não tem destino.
   */
  const grantConsent = async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      await createHealthService(supabase).grantCollectionConsent(userId);
      setEligibility({ podeEscanear: true });
      return true;
    } catch {
      // Sem o erro: o do PostgREST pode carregar o payload do consentimento.
      registrarFalha('body_scan.grant_consent');
      return false;
    }
  };

  return { gate, grantConsent };
}

/** Zera o scan anterior e segue para o preparo, que vem sempre antes da câmera. */
function useStartScan() {
  const router = useRouter();
  const { studentId, id } = useLocalSearchParams<{ studentId?: string; id?: string }>();
  const authUserId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { startScan, setStudentId } = useAssessmentStore();

  return async () => {
    const targetId = studentId || id || authUserId || undefined;
    if (targetId) setStudentId(targetId);
    await startScan();
    // O preparo muda a cada sessão: o cômodo de hoje não é o de duas semanas
    // atrás (`ADR-0022`).
    router.push({ pathname: ROUTES.ASSESSMENT.TUTORIAL, params: { studentId: targetId } });
  };
}

/**
 * O que falta, em vidro âmbar. Parágrafo por parágrafo e no tom do texto: o
 * aviso de consentimento tem três blocos e precisa ser lido de fato —
 * autorização dada sobre texto que ninguém lê não autoriza nada.
 */
function GateNotice({ gate }: { gate: AvisoDoPortao }) {
  return (
    <View className="mt-3 rounded-[1.375rem] border border-metrica-gordura/40 bg-metrica-gordura/10 p-4">
      <Text className="text-[0.9375rem] font-bold text-texto-macro-gordura">{gate.titulo}</Text>
      {gate.texto.split('\n\n').map((paragraph) => (
        <Text
          key={paragraph}
          className="mt-2.5 text-[0.8125rem] leading-[1.22rem] text-muted-foreground"
        >
          {paragraph}
        </Text>
      ))}
    </View>
  );
}
