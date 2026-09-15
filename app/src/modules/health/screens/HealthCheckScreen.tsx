import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useConsentPromptStore } from '@/components/consent/consentPromptStore';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { openPlatformSettings } from '@/shared/wearable';
import { useHealthCheck } from '../hooks/useHealthCheck';
import type { CheckFix, CheckId, HealthCheck } from '../services/healthChecklist';

export interface HealthCheckScreenProps {
  studentId: string;
}

const CHECK_ICON: Record<CheckId, keyof typeof Ionicons.glyphMap> = {
  consent: 'shield-checkmark-outline',
  watch: 'watch-outline',
  sleep: 'moon-outline',
  workoutHeartRate: 'pulse-outline',
  background: 'sync-outline',
  history: 'albums-outline',
};

/**
 * Tela 6 do kit: o health check. O resultado, as verificações com o que falta e,
 * para cada pendência que o Student resolve, o "Ajustar" que leva até lá.
 *
 * O resumo diz que nenhuma pendência impede de treinar: é diagnóstico, e não
 * bloqueio. Pendência que o tempo resolve (histórico curto, relógio sem leitura
 * ainda) aparece como "Aguardando", sem botão.
 *
 * @example <HealthCheckScreen studentId={user.id} />
 */
export function HealthCheckScreen({ studentId }: HealthCheckScreenProps) {
  const router = useRouter();
  const { result, recheck } = useHealthCheck(studentId);
  const resolve = useResolve();
  const firstFix = result?.checks.find((item) => item.state === 'attention' && item.fix !== 'none');

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Ignorar', icone: 'close', onPress: router.back }}
          principal={{
            rotulo: 'Resolver pendências',
            icone: 'construct-outline',
            desabilitada: !firstFix,
            onPress: () => firstFix && resolve(firstFix.fix),
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        <View className="min-w-0 flex-1">
          <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
            Diagnóstico
          </Text>
          <Text className="mt-0.5 text-[1.3125rem] font-bold tracking-tight text-hero">
            Health check
          </Text>
        </View>
        <BotaoRedondo icone="refresh-cw" rotulo="Conferir de novo" onPress={recheck} />
      </View>

      {result ? (
        <>
          <Summary okCount={result.okCount} total={result.total} checks={result.checks} />
          <TituloDeSecao estilo="rotulo">Verificações</TituloDeSecao>
          {result.checks.map((item) => (
            <CheckRow key={item.id} check={item} onFix={resolve} />
          ))}
          {result.checks.some((item) => item.id === 'history' && item.state !== 'ok') ? (
            <EmptyHistoryNote />
          ) : null}
        </>
      ) : (
        <Vidro classeExterna="mt-4" className="items-center p-6">
          <Text className="text-legenda text-muted-foreground">Conferindo…</Text>
        </Vidro>
      )}
    </GlassScreen>
  );
}

/** Aonde cada "Ajustar" leva. */
function useResolve(): (fix: CheckFix) => void {
  const router = useRouter();
  const requestConsent = useConsentPromptStore((state) => state.request);
  return (fix) => {
    if (fix === 'consent') requestConsent();
    if (fix === 'permissions') router.push(ROUTES.HEALTH.PERMISSIONS);
    if (fix === 'settings') void openPlatformSettings();
  };
}

const SUMMARY_ICON = 30;

function Summary({
  okCount,
  total,
  checks,
}: {
  okCount: number;
  total: number;
  checks: HealthCheck[];
}) {
  const cores = useCores();
  const escalar = useEscala();
  const allGood = okCount === total;
  const blocking = checks.filter((item) => item.state === 'attention').length;
  const message = allGood
    ? 'O app acompanha tudo o que o seu relógio entrega.'
    : blocking > 0
      ? `${blocking === 1 ? 'Um ponto limita' : `${blocking} pontos limitam`} o que conseguimos acompanhar. Nenhum impede você de treinar.`
      : 'Falta só o tempo: os números aparecem conforme os dias chegam.';

  return (
    <Vidro classeExterna="mt-4" className="items-center p-[1.125rem]">
      <View
        className={cn(
          'h-16 w-16 items-center justify-center rounded-full border-[0.09375rem]',
          allGood
            ? 'border-metrica-passos bg-metrica-passos/15'
            : 'border-metrica-gordura bg-metrica-gordura/15'
        )}
      >
        <Ionicons
          name={allGood ? 'checkmark-done' : 'warning-outline'}
          size={escalar(SUMMARY_ICON)}
          color={allGood ? cores.textoPassos : cores.textoGordura}
        />
      </View>
      <Text className="mt-3 font-display-black text-[1.1875rem] tracking-tight text-foreground">
        {allGood ? 'Tudo certo' : `${okCount} de ${total} tudo certo`}
      </Text>
      <Text className="mt-1.5 text-center text-[0.78125rem] leading-[1.1rem] text-muted-foreground">
        {message}
      </Text>
    </Vidro>
  );
}

const STATUS_ICON = 18;

function CheckRow({ check, onFix }: { check: HealthCheck; onFix: (fix: CheckFix) => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const ok = check.state === 'ok';

  const right = ok ? (
    <Ionicons name="checkmark-circle" size={escalar(STATUS_ICON)} color={cores.textoPassos} />
  ) : check.fix === 'none' ? (
    <Text className="text-[0.65625rem] font-extrabold uppercase tracking-wide text-placeholder">
      Aguardando
    </Text>
  ) : (
    <TouchableOpacity
      onPress={() => onFix(check.fix)}
      accessibilityRole="button"
      accessibilityLabel={`Ajustar ${check.title}`}
    >
      <Text className="text-[0.65625rem] font-extrabold uppercase tracking-wide text-texto-macro-gordura">
        Ajustar
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinhaDeVidro
      icon={CHECK_ICON[check.id]}
      tom={ok ? 'passos' : 'gordura'}
      titulo={check.title}
      sub={check.detail}
      direita={right}
    />
  );
}

const NOTE_ICON = 28;

function EmptyHistoryNote() {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="mt-1.5 items-center rounded-xl border border-dashed border-glass-border p-[1.125rem]">
      <Ionicons name="watch-outline" size={escalar(NOTE_ICON)} color={cores.placeholder} />
      <Text className="mt-2.5 text-center text-[0.78125rem] leading-[1.1rem] text-muted-foreground">
        Ainda não há histórico suficiente. Conecte seu relógio e volte amanhã — é a comparação entre
        os dias que faz esses números valerem alguma coisa.
      </Text>
    </View>
  );
}
